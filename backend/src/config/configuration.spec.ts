import { appConfig } from './configuration';
import { validateEnvironment } from './env.validation';

describe('App Configuration Foundation', () => {
  it('should load default configuration values correctly', () => {
    const originalTimezone = process.env.DEFAULT_TIMEZONE;
    delete process.env.DEFAULT_TIMEZONE;

    try {
      const config = appConfig();

      expect(config.port).toBe(8000);
      expect(config.defaultTimezone).toBe('Asia/Kolkata');
      expect(config.defaultTimeoutMs).toBe(30000);
      expect(config.zeroAiPolicyEnforced).toBe(true);
      expect(config.redis.port).toBe(6379);
      expect(config.worker.concurrency).toBe(2);
      expect(Array.isArray(config.allowedDomains)).toBe(true);
      expect(Array.isArray(config.corsOrigins)).toBe(true);
    } finally {
      if (originalTimezone !== undefined) {
        process.env.DEFAULT_TIMEZONE = originalTimezone;
      }
    }
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

  it('should prioritize JWT_SECRET_KEY if provided', () => {
    const origSecret = process.env.JWT_SECRET;
    const origSecretKey = process.env.JWT_SECRET_KEY;

    try {
      process.env.JWT_SECRET = 'secret-a';
      process.env.JWT_SECRET_KEY = 'secret-key-b';
      let config = appConfig();
      expect(config.jwtSecret).toBe('secret-key-b');

      delete process.env.JWT_SECRET_KEY;
      config = appConfig();
      expect(config.jwtSecret).toBe('secret-a');
    } finally {
      if (origSecret !== undefined) {
        process.env.JWT_SECRET = origSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
      if (origSecretKey !== undefined) {
        process.env.JWT_SECRET_KEY = origSecretKey;
      } else {
        delete process.env.JWT_SECRET_KEY;
      }
    }
  });

  describe('validateEnvironment (Production Security Guards)', () => {
    const strongSecret = 'a'.repeat(32);

    it('rejects weak or placeholder secrets in production', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'production',
          JWT_SECRET: 'enterprise-production-jwt-secret-key-32chars',
          APP_ENCRYPTION_KEY: strongSecret,
          INTERNAL_SERVICE_KEY: strongSecret,
          DATABASE_URL: 'postgresql://user:pass@db:5432/app',
        }),
      ).toThrow();
    });

    it('rejects ALLOW_LOCALHOST_AUTOMATION=true in production', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'production',
          JWT_SECRET: strongSecret,
          APP_ENCRYPTION_KEY: strongSecret,
          INTERNAL_SERVICE_KEY: strongSecret,
          DATABASE_URL: 'postgresql://user:pass@db:5432/app',
          ALLOW_LOCALHOST_AUTOMATION: 'true',
        }),
      ).toThrow(/ALLOW_LOCALHOST_AUTOMATION/);
    });

    it('rejects DB_SYNCHRONIZE=true in production', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'production',
          JWT_SECRET: strongSecret,
          APP_ENCRYPTION_KEY: strongSecret,
          INTERNAL_SERVICE_KEY: strongSecret,
          DATABASE_URL: 'postgresql://user:pass@db:5432/app',
          DB_SYNCHRONIZE: 'true',
        }),
      ).toThrow(/DB_SYNCHRONIZE/);
    });

    it('accepts valid strong production configuration', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'production',
          JWT_SECRET: strongSecret,
          APP_ENCRYPTION_KEY: strongSecret,
          INTERNAL_SERVICE_KEY: strongSecret,
          DATABASE_URL: 'postgresql://user:pass@db:5432/app',
          DB_SYNCHRONIZE: 'false',
        }),
      ).not.toThrow();
    });
  });
});
