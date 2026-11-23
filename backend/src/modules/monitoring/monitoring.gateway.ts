import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocket } from 'ws';
import Redis from 'ioredis';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ExecutionStepEntity } from '../../database/entities/execution-step.entity';
import { ProjectsService } from '../projects/projects.service';
import { EventPublisherService } from './event-publisher.service';

interface ClientContext {
  executionId: string;
  userId: string;
  redisSubscriber?: Redis;
  unsubscribe?: () => void;
}

@WebSocketGateway({ path: '/ws/executions' })
export class MonitoringGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MonitoringGateway.name);
  private readonly clients = new Map<WebSocket, ClientContext>();

  @WebSocketServer()
  server: any;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly eventPublisher: EventPublisherService,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    @InjectRepository(ExecutionStepEntity)
    private readonly stepRepository: Repository<ExecutionStepEntity>,
  ) {}

  async handleConnection(client: WebSocket, request: any) {
    try {
      const host = request?.headers?.host || 'localhost';
      const url = new URL(request?.url || '', `ws://${host}`);
      const pathname = url.pathname;

      // Extract execution_id from pathname /ws/executions/:id
      const match = pathname.match(/\/ws\/executions\/([a-zA-Z0-9_-]+)/);
      const executionId = match ? match[1] : null;

      if (!executionId) {
        this.logger.warn(`Rejected WS connection with invalid path: ${pathname}`);
        client.close(1008, 'Invalid execution path');
        return;
      }

      // Extract token from query param, cookies, or authorization header
      let token = url.searchParams.get('token') || url.searchParams.get('auth_token');
      if (!token && request.headers.cookie) {
        const cookies = request.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [k, v] = cookie.trim().split('=');
          if (k === 'access_token' || k === 'auth_token' || k === 'token') token = v;
        }
      }
      if (!token && request.headers.authorization) {
        const auth = request.headers.authorization;
        if (auth.toLowerCase().startsWith('bearer ')) {
          token = auth.slice(7).trim();
        }
      }

      let payload: any = { sub: 'authenticated-user', is_superuser: true };
      if (token) {
        try {
          const jwtSecret = this.configService.get<string>('app.jwtSecret') || 'default-secret';
          payload = this.jwtService.verify(token, { secret: jwtSecret });
        } catch (err: any) {
          if (process.env.NODE_ENV !== 'development') {
            this.logger.warn(`Rejected WS connection: Invalid token for ${executionId}`);
            client.close(1008, 'Invalid token');
            return;
          }
        }
      } else if (process.env.NODE_ENV !== 'development') {
        this.logger.warn(`Rejected WS connection: Missing auth token for ${executionId}`);
        client.close(1008, 'Authentication required');
        return;
      }

      const userId = payload.sub || payload.userId;
      const isSuperuser = payload.is_superuser ?? false;

      // Verify execution exists and user has project access
      const execution = await this.executionRepository.findOne({ where: { id: executionId } });
      if (!execution) {
        this.logger.warn(`Rejected WS connection: Execution '${executionId}' not found`);
        client.close(1008, 'Execution not found');
        return;
      }

      if (execution.projectId) {
        try {
          await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
        } catch {
          this.logger.warn(`Rejected WS connection: Unauthorized access to project for ${executionId}`);
          client.close(1008, 'Project access denied');
          return;
        }
      }

      // Setup Redis Subscriber for this client
      const redisConfig = this.configService.get('app.redis');
      const redisSubscriber = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        lazyConnect: true,
      });

      // Register direct in-memory pub/sub listener (instant zero-latency streaming)
      const unsub = this.eventPublisher.subscribe(executionId, (event) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(event));
          } catch {}
        }
      });

      const clientCtx: ClientContext = {
        executionId,
        userId,
        redisSubscriber,
        unsubscribe: unsub,
      };
      this.clients.set(client, clientCtx);

      await redisSubscriber.connect().catch((e) => {
        this.logger.warn(`Redis subscriber failed to connect: ${e.message}`);
      });

      const channel1 = `execution:events:${executionId}`;
      const channel2 = `execution:channel:${executionId}`;
      await redisSubscriber.subscribe(channel1, channel2).catch(() => {});

      redisSubscriber.on('message', (_chan, message) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      // Send initial connected event to client
      client.send(
        JSON.stringify({
          type: 'connected',
          execution_id: executionId,
          status: execution.status,
          session_id: execution.sessionId,
          timestamp: new Date().toISOString(),
        }),
      );

      // Listen for client incoming messages
      client.on('message', async (data: any) => {
        try {
          const raw = data.toString();
          const msg = JSON.parse(raw);
          await this.handleClientMessage(client, clientCtx, msg);
        } catch {}
      });

      this.logger.log(`Client authenticated and connected to WS monitor for execution: ${executionId}`);
    } catch (err: any) {
      this.logger.error(`Error during WS handleConnection: ${err.message}`, err.stack);
      client.close(1011, 'Internal server error');
    }
  }

  async handleDisconnect(client: WebSocket) {
    const ctx = this.clients.get(client);
    if (ctx) {
      if (ctx.unsubscribe) {
        ctx.unsubscribe();
      }
      if (ctx.redisSubscriber) {
        await ctx.redisSubscriber.quit().catch(() => {});
      }
      this.clients.delete(client);
      this.logger.log(`Client disconnected from WS monitor for execution: ${ctx.executionId}`);
    }
  }

  private async handleClientMessage(client: WebSocket, ctx: ClientContext, msg: any) {
    const action = msg.action || msg.type;

    if (action === 'ping') {
      client.send(
        JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (action === 'get_status') {
      const execution = await this.executionRepository.findOne({ where: { id: ctx.executionId } });
      if (execution) {
        client.send(
          JSON.stringify({
            type: 'execution:status_change',
            execution_id: ctx.executionId,
            data: {
              status: execution.status,
              duration_ms: execution.durationMs,
              session_id: execution.sessionId,
            },
            timestamp: new Date().toISOString(),
          }),
        );
      }
    } else if (action === 'capture_viewport') {
      const latestStep = await this.stepRepository.findOne({
        where: { executionId: ctx.executionId },
        order: { stepIndex: 'DESC' },
      });

      if (latestStep?.screenshotPath) {
        client.send(
          JSON.stringify({
            type: 'viewport:frame',
            execution_id: ctx.executionId,
            data: {
              artifact_path: latestStep.screenshotPath,
              viewport_url: `/api/v1/executions/${ctx.executionId}/viewport`,
              step_index: latestStep.stepIndex,
            },
            timestamp: new Date().toISOString(),
          }),
        );
      } else {
        client.send(
          JSON.stringify({
            type: 'error',
            message: 'No viewport screenshot captured yet for this execution.',
          }),
        );
      }
    }
  }
}
