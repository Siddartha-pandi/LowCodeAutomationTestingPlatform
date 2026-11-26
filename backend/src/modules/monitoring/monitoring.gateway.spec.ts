import { EventPublisherService, redactSensitivePayload } from './event-publisher.service';
import { MonitoringGateway } from './monitoring.gateway';

describe('WebSocket & EventPublisher Security and Reliability', () => {
  it('redacts sensitive credential keys before emitting events', () => {
    const cleaned = redactSensitivePayload({
      node_id: 'step-1',
      password: 'my-secret-password',
      nested: { token: 'jwt-123', safe: 'ok' },
    });
    expect(cleaned.password).toBe('[REDACTED]');
    expect(cleaned.nested.token).toBe('[REDACTED]');
    expect(cleaned.nested.safe).toBe('ok');
  });

  it('rejects unauthenticated WebSocket connections with close code 1008', async () => {
    const gateway = new MonitoringGateway(
      { verify: jest.fn() } as any,
      { get: jest.fn() } as any,
      { verifyProjectAccess: jest.fn() } as any,
      new EventPublisherService({ get: jest.fn() } as any),
      { findOne: jest.fn() } as any,
      { findOne: jest.fn() } as any,
    );

    const mockClient = { close: jest.fn(), send: jest.fn(), on: jest.fn() } as any;
    await gateway.handleConnection(mockClient, { url: '/ws/executions/exec-1', headers: { host: 'localhost' } });
    expect(mockClient.close).toHaveBeenCalledWith(1008, 'Authentication required');
  });

  it('rejects unauthorized project WebSocket subscriptions', async () => {
    const gateway = new MonitoringGateway(
      { verify: jest.fn().mockReturnValue({ sub: 'attacker', is_superuser: false }) } as any,
      { get: jest.fn().mockReturnValue('secret') } as any,
      { verifyProjectAccess: jest.fn().mockRejectedValue(new Error('Forbidden')) } as any,
      new EventPublisherService({ get: jest.fn() } as any),
      { findOne: jest.fn().mockResolvedValue({ id: 'exec-1', projectId: 'proj-1' }) } as any,
      { findOne: jest.fn() } as any,
    );

    const mockClient = { close: jest.fn(), send: jest.fn(), on: jest.fn() } as any;
    await gateway.handleConnection(mockClient, {
      url: '/ws/executions/exec-1',
      headers: { host: 'localhost', cookie: 'access_token=valid.jwt.token' },
    });
    expect(mockClient.close).toHaveBeenCalledWith(1008, 'Project access denied');
  });
});
