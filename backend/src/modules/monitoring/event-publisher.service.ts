import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ExecutionEventType } from '../../contracts/events.contract';
import { buildRedisConnectionOptions } from '../../common/network/redis-options';

const SENSITIVE_KEY_PATTERN = /^(password|secret|token|authorization|api_key|apikey|credential|private_key)$/i;

export function redactSensitivePayload(value: any, depth = 0): any {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitivePayload(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitivePayload(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPublisherService.name);
  private redisClient: Redis;
  private redisSubscriber: Redis;
  private readonly sequences = new Map<string, number>();
  private readonly inMemorySubscribers = new Map<string, Set<(event: any) => void>>();
  private readonly remoteChannelCallbacks = new Map<string, Set<(event: any) => void>>();

  constructor(private readonly configService: ConfigService) {}

  subscribe(executionId: string, cb: (event: any) => void): () => void {
    if (!this.inMemorySubscribers.has(executionId)) {
      this.inMemorySubscribers.set(executionId, new Set());
    }
    this.inMemorySubscribers.get(executionId)!.add(cb);
    return () => {
      const set = this.inMemorySubscribers.get(executionId);
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          this.inMemorySubscribers.delete(executionId);
        }
      }
    };
  }

  /**
   * Reference-counted subscription on a single shared Redis Pub/Sub client.
   * Prevents opening a dedicated TCP connection per WebSocket client.
   */
  async subscribeRemote(
    executionId: string,
    cb: (event: any) => void,
  ): Promise<() => Promise<void>> {
    const channel = `execution:events:${executionId}`;
    let set = this.remoteChannelCallbacks.get(channel);
    const isNewChannel = !set;
    if (!set) {
      set = new Set();
      this.remoteChannelCallbacks.set(channel, set);
    }
    set.add(cb);

    if (isNewChannel && this.redisSubscriber && this.redisSubscriber.status === 'ready') {
      await this.redisSubscriber.subscribe(channel).catch((e) => {
        this.logger.warn(`Redis subscribe failed for ${channel}: ${e.message}`);
      });
    }

    return async () => {
      const current = this.remoteChannelCallbacks.get(channel);
      if (current) {
        current.delete(cb);
        if (current.size === 0) {
          this.remoteChannelCallbacks.delete(channel);
          if (this.redisSubscriber && this.redisSubscriber.status === 'ready') {
            await this.redisSubscriber.unsubscribe(channel).catch(() => {});
          }
        }
      }
    };
  }

  onModuleInit() {
    const redisConfig = this.configService.get('app.redis');
    const retryStrategy = (times: number) => Math.min(times * 500, 10000);

    this.redisClient = new Redis(
      buildRedisConnectionOptions(redisConfig, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy,
      }),
    );
    this.redisClient.on('error', (err) => {
      this.logger.debug(`Redis publisher error: ${err.message}`);
    });
    this.redisClient.connect().catch((err) => {
      this.logger.warn(`Redis publisher failed to connect: ${err.message}. Operating in in-memory fallback.`);
    });

    this.redisSubscriber = new Redis(
      buildRedisConnectionOptions(redisConfig, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy,
      }),
    );
    this.redisSubscriber.on('error', (err) => {
      this.logger.debug(`Redis subscriber error: ${err.message}`);
    });
    this.redisSubscriber.on('ready', () => {
      const channels = Array.from(this.remoteChannelCallbacks.keys());
      if (channels.length > 0) {
        void this.redisSubscriber.subscribe(...channels).catch(() => {});
      }
    });
    this.redisSubscriber.on('message', (channel, message) => {
      const callbacks = this.remoteChannelCallbacks.get(channel);
      if (!callbacks || callbacks.size === 0) return;
      let parsed: any;
      try {
        parsed = JSON.parse(message);
      } catch {
        return;
      }
      for (const cb of callbacks) {
        try {
          cb(parsed);
        } catch {}
      }
    });
    this.redisSubscriber.connect().catch((err) => {
      this.logger.warn(`Redis shared subscriber failed to connect: ${err.message}`);
    });
  }

  async publish<T = any>(executionId: string, type: ExecutionEventType, payload: T): Promise<void> {
    if (this.sequences.size > 10000) {
      const oldestKey = this.sequences.keys().next().value;
      if (oldestKey) this.sequences.delete(oldestKey);
    }
    const currentSeq = (this.sequences.get(executionId) || 0) + 1;
    this.sequences.set(executionId, currentSeq);

    const eventId = `evt-${Date.now()}-${currentSeq}`;
    const timestamp = new Date().toISOString();
    const safePayload = redactSensitivePayload(payload);

    const event = {
      event_id: eventId,
      id: eventId,
      execution_id: executionId,
      seq: currentSeq,
      timestamp,
      type,
      payload: safePayload,
      data: safePayload,
    };

    // 1. In-memory local subscribers (instant, 0ms latency)
    const localSubs = this.inMemorySubscribers.get(executionId);
    if (localSubs && localSubs.size > 0) {
      for (const cb of localSubs) {
        try {
          cb(event);
        } catch (e: any) {
          this.logger.debug(`In-memory subscriber error: ${e.message}`);
        }
      }
    }

    const payloadJson = JSON.stringify(event);
    const channel1 = `execution:events:${executionId}`;
    const channel2 = `execution:channel:${executionId}`;

    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await Promise.all([
          this.redisClient.publish(channel1, payloadJson),
          this.redisClient.publish(channel2, payloadJson),
        ]);
      }
    } catch (err: any) {
      this.logger.debug(`Failed to publish event to Redis: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    this.inMemorySubscribers.clear();
    this.remoteChannelCallbacks.clear();
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit().catch(() => {});
    }
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => {});
    }
  }
}
