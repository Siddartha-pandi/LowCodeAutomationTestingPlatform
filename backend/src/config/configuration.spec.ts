import { appConfig } from './configuration';

describe('App Configuration Foundation', () => {
  it('should load default configuration values correctly', () => {
    const config = appConfig();

    expect(config.port).toBe(8000);
    expect(config.defaultTimezone).toBe('Asia/Kolkata');
    expect(config.defaultTimeoutMs).toBe(30000);
    expect(config.zeroAiPolicyEnforced).toBe(true);
    expect(config.redis.port).toBe(6379);
    expect(config.worker.concurrency).toBe(2);
    expect(Array.isArray(config.allowedDomains)).toBe(true);
    expect(Array.isArray(config.corsOrigins)).toBe(true);
  });

  it('should read custom environment variables', () => {
    const originalPort = process.env.PORT;
    process.env.PORT = '9999';

    const config = appConfig();
    expect(config.port).toBe(9999);

    if (originalPort !== undefined) {
      process.env.PORT = originalPort;
    } else {
      delete process.env.PORT;
    }
  });
});
