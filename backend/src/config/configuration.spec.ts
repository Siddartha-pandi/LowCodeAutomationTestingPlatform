import { appConfig, resolveStorageDir } from './configuration';
import { validateEnvironment } from './env.validation';
import { buildRedisConnectionOptions, parseRedisConfig } from '../common/network/redis-options';

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

    it('accepts valid strong production configuration and preserves DATABASE_SSL', () => {
      const validated = validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: strongSecret,
        APP_ENCRYPTION_KEY: strongSecret,
        INTERNAL_SERVICE_KEY: strongSecret,
        DATABASE_URL: 'postgresql://user:pass@db:5432/app?sslmode=require',
        DATABASE_SSL: 'true',
        DB_SYNCHRONIZE: 'false',
        CUSTOM_VAR: 'preserved',
      });
      expect(validated.DATABASE_SSL).toBe('true');
      expect((validated as any).CUSTOM_VAR).toBe('preserved');
    });

    it('falls back to local storage directory when /workspaces container path does not exist locally', () => {
      const resolved = resolveStorageDir('/workspaces/LowCodeAutomationTestingPlatform/storage');
      expect(resolved).toContain('storage');
    });

    it('parses REDIS_URL including rediss TLS and ACL credentials', () => {
      const parsed = parseRedisConfig({
        REDIS_URL: 'rediss://default:secret%40pass@redis.example.com:6380/2',
      } as NodeJS.ProcessEnv);
      expect(parsed).toEqual({
        host: 'redis.example.com',
        port: 6380,
        username: 'default',
        password: 'secret@pass',
        db: 2,
        tls: true,
      });

      const conn = buildRedisConnectionOptions(parsed, { maxRetriesPerRequest: null });
      expect(conn).toMatchObject({
        host: 'redis.example.com',
        port: 6380,
        username: 'default',
        password: 'secret@pass',
        db: 2,
        tls: {},
        maxRetriesPerRequest: null,
      });
    });

    it('forces secure=true when COOKIE_SAME_SITE=none', () => {
      const origSameSite = process.env.COOKIE_SAME_SITE;
      const origSecure = process.env.COOKIE_SECURE;
      try {
        process.env.COOKIE_SAME_SITE = 'none';
        delete process.env.COOKIE_SECURE;
        const cfg = appConfig();
        expect(cfg.cookie.sameSite).toBe('none');
        expect(cfg.cookie.secure).toBe(true);
      } finally {
        if (origSameSite !== undefined) process.env.COOKIE_SAME_SITE = origSameSite;
        else delete process.env.COOKIE_SAME_SITE;
        if (origSecure !== undefined) process.env.COOKIE_SECURE = origSecure;
        else delete process.env.COOKIE_SECURE;
      }
    });
  });
});
