import { z } from 'zod';

const KNOWN_INSECURE_PLACEHOLDERS = new Set([
  'enterprise-production-jwt-secret-key-32chars',
  'enterprise-master-encryption-key-32chars',
  'enterprise-internal-secret-service-key-32chars',
  'change-me',
  'secret',
  'password',
]);

function isWeakSecret(val: unknown): boolean {
  if (typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (trimmed.length < 32) return true;
  if (trimmed.startsWith('CHANGE_ME')) return true;
  if (KNOWN_INSECURE_PLACEHOLDERS.has(trimmed)) return true;
  return false;
}

export const environmentSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    PORT: z.string().optional().default('8000'),
    DATABASE_URL: z.string().optional().default('postgresql://postgres:postgres@localhost:5432/automation_platform_db'),
    DATABASE_SSL: z.string().optional(),
    DB_SYNCHRONIZE: z.string().optional(),
    RUN_MIGRATIONS: z.string().optional(),
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().optional().default('127.0.0.1'),
    REDIS_PORT: z.string().optional().default('6379'),
    REDIS_USERNAME: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().optional(),
    REDIS_TLS: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    COOKIE_SECURE: z.string().optional(),
    COOKIE_SAME_SITE: z.string().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_SECRET_KEY: z.string().optional(),
    TOKEN_EXPIRY_MINUTES: z.string().optional(),
    APP_ENCRYPTION_KEY: z.string().optional(),
    CREDENTIALS_MASTER_KEY: z.string().optional(),
    INTERNAL_SERVICE_KEY: z.string().optional(),
    STORAGE_DIR: z.string().optional(),
    ALLOW_LOCALHOST_AUTOMATION: z.string().optional(),
    CORS_ORIGINS: z.string().optional(),
    ALLOWED_DOMAINS: z.string().optional(),
    EMBED_WORKER: z.string().optional(),
    WORKER_CONCURRENCY: z.string().optional(),
    BROWSER_TIMEOUT_MS: z.string().optional(),
    DEFAULT_TIMEZONE: z.string().optional(),
  })
  .passthrough();

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = environmentSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.format();
    throw new Error(`Environment validation failed: ${JSON.stringify(errors, null, 2)}`);
  }

  if (config.NODE_ENV === 'production') {
    const jwtSecret = config.JWT_SECRET_KEY || config.JWT_SECRET;
    if (isWeakSecret(jwtSecret)) {
      throw new Error(
        'Environment validation failed: JWT_SECRET / JWT_SECRET_KEY must be a strong secret (>= 32 chars, non-placeholder) in production.',
      );
    }

    const encKey = config.APP_ENCRYPTION_KEY || config.CREDENTIALS_MASTER_KEY;
    if (isWeakSecret(encKey)) {
      throw new Error(
        'Environment validation failed: APP_ENCRYPTION_KEY / CREDENTIALS_MASTER_KEY must be a strong secret (>= 32 chars, non-placeholder) in production.',
      );
    }

    if (isWeakSecret(config.INTERNAL_SERVICE_KEY)) {
      throw new Error(
        'Environment validation failed: INTERNAL_SERVICE_KEY must be a strong secret (>= 32 chars, non-placeholder) in production.',
      );
    }

    if (!config.DATABASE_URL) {
      throw new Error('Environment validation failed: DATABASE_URL must be set in production.');
    }

    if (config.ALLOW_LOCALHOST_AUTOMATION === 'true') {
      throw new Error(
        'Environment validation failed: ALLOW_LOCALHOST_AUTOMATION=true is strictly prohibited in production.',
      );
    }

    if (config.DB_SYNCHRONIZE === 'true') {
      throw new Error(
        'Environment validation failed: DB_SYNCHRONIZE=true is strictly prohibited in production. Run TypeORM migrations instead.',
      );
    }
  }

  return parsed.data;
}
