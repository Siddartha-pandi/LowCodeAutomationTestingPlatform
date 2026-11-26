# WebSocket & Redis Pub/Sub Reliability — LowCodeAutomationTestingPlatform

## 1. Authentication & Authorization (`MonitoringGateway`)

- All WebSocket connections to `/ws/executions/:id` require a valid JWT (read from `access_token` HttpOnly cookie, `Authorization: Bearer` header, or `token` query param). No development auth bypass exists.
- The gateway verifies the execution exists and calls `ProjectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser)` before subscribing.

## 2. Shared Redis Subscriber & Deduplication (`EventPublisherService`)

- `EventPublisherService` maintains **one shared `redisSubscriber` connection** with reference-counted channel subscriptions (`remoteChannelCallbacks`) instead of opening a new Redis connection per WebSocket client.
- On Redis reconnect (`ready` event), all active execution channels are automatically re-subscribed.
- Events are deduplicated per client by `event_id` so local in-process emissions and Redis Pub/Sub deliveries never duplicate messages.
- Sensitive fields (`password`, `secret`, `token`, `authorization`, `api_key`, etc.) are automatically redacted via `redactSensitivePayload()` before event emission.

## 3. Lifecycle & Cleanup

- Client subscriptions are cleaned up idempotently on `handleDisconnect`, `close`, and `error` events, releasing reference counts and unsubscribing unused Redis channels.
