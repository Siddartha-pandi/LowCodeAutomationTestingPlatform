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
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ExecutionStepEntity } from '../../database/entities/execution-step.entity';
import { ProjectsService } from '../projects/projects.service';
import { EventPublisherService } from './event-publisher.service';

interface ClientContext {
  executionId: string;
  userId: string;
  unsubscribeLocal?: () => void;
  unsubscribeRemote?: () => Promise<void>;
  seenEventIds: Set<string>;
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

      const match = pathname.match(/\/ws\/executions\/([a-zA-Z0-9_-]+)/);
      const executionId = match ? match[1] : null;

      if (!executionId) {
        this.logger.warn(`Rejected WS connection with invalid path: ${pathname}`);
        client.close(1008, 'Invalid execution path');
        return;
      }

      // Extract token from cookies (preferred), Authorization header, or query fallback
      let token: string | null = null;
      if (request.headers?.cookie) {
        const cookies = request.headers.cookie.split(';');
        for (const cookie of cookies) {
          const idx = cookie.indexOf('=');
          if (idx > 0) {
            const k = cookie.slice(0, idx).trim();
            const v = decodeURIComponent(cookie.slice(idx + 1).trim());
            if (k === 'access_token' || k === 'auth_token' || k === 'token') {
              token = v;
              break;
            }
          }
        }
      }
      if (!token && request.headers?.authorization) {
        const auth = request.headers.authorization;
        if (auth.toLowerCase().startsWith('bearer ')) {
          token = auth.slice(7).trim();
        }
      }
      if (!token) {
        token = url.searchParams.get('token') || url.searchParams.get('auth_token');
      }

      if (!token) {
        this.logger.warn(`Rejected WS connection: Missing auth token for ${executionId}`);
        client.close(1008, 'Authentication required');
        return;
      }

      let payload: any;
      try {
        const jwtSecret = this.configService.get<string>('app.jwtSecret');
        if (!jwtSecret) {
          throw new Error('JWT secret is not configured');
        }
        payload = this.jwtService.verify(token, { secret: jwtSecret });
      } catch {
        this.logger.warn(`Rejected WS connection: Invalid token for ${executionId}`);
        client.close(1008, 'Invalid token');
        return;
      }

      const userId = payload.sub;
      const isSuperuser = Boolean(payload.is_superuser);
      if (!userId) {
        client.close(1008, 'Invalid token subject');
        return;
      }

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

      const seenEventIds = new Set<string>();
      const forwardEvent = (event: any) => {
        if (client.readyState !== WebSocket.OPEN) return;
        const eid = event?.event_id;
        if (eid) {
          if (seenEventIds.has(eid)) return;
          if (seenEventIds.size > 2000) seenEventIds.clear();
          seenEventIds.add(eid);
        }
        try {
          client.send(JSON.stringify(event));
        } catch {}
      };

      const unsubscribeLocal = this.eventPublisher.subscribe(executionId, forwardEvent);
      const unsubscribeRemote = await this.eventPublisher.subscribeRemote(executionId, forwardEvent);

      const clientCtx: ClientContext = {
        executionId,
        userId,
        unsubscribeLocal,
        unsubscribeRemote,
        seenEventIds,
      };
      this.clients.set(client, clientCtx);

      client.on('close', () => {
        void this.cleanupClient(client);
      });
      client.on('error', () => {
        void this.cleanupClient(client);
      });

      client.send(
        JSON.stringify({
          type: 'connected',
          execution_id: executionId,
          status: execution.status,
          session_id: execution.sessionId,
          timestamp: new Date().toISOString(),
        }),
      );

      client.on('message', async (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
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
    await this.cleanupClient(client);
  }

  private async cleanupClient(client: WebSocket) {
    const ctx = this.clients.get(client);
    if (!ctx) return;
    this.clients.delete(client);
    try {
      ctx.unsubscribeLocal?.();
      if (ctx.unsubscribeRemote) {
        await ctx.unsubscribeRemote();
      }
    } catch {}
    ctx.seenEventIds.clear();
    this.logger.log(`Client disconnected from WS monitor for execution: ${ctx.executionId}`);
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
