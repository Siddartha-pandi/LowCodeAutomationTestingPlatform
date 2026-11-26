import { z } from 'zod';

export const environmentSchema = z.object({
  PORT: z.string().optional().default('8000'),
  DATABASE_URL: z.string().optional().default('postgresql://postgres:postgres@localhost:5432/automation_platform_db'),
  REDIS_HOST: z.string().optional().default('127.0.0.1'),
  REDIS_PORT: z.string().optional().default('6379'),
  JWT_SECRET: z.string().optional().default('enterprise-production-jwt-secret-key-32chars'),
  JWT_SECRET_KEY: z.string().optional(),
  APP_ENCRYPTION_KEY: z.string().optional(),
  STORAGE_DIR: z.string().optional(),
});

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = environmentSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.format();
    throw new Error(`Environment validation failed: ${JSON.stringify(errors, null, 2)}`);
  }

  if (config.NODE_ENV === 'production') {
    const jwtSecret = config.JWT_SECRET_KEY || config.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'enterprise-production-jwt-secret-key-32chars') {
      throw new Error('Environment validation failed: JWT_SECRET must be explicitly set to a strong secret in production.');
    }
    if (!config.APP_ENCRYPTION_KEY && !config.CREDENTIALS_MASTER_KEY) {
      throw new Error('Environment validation failed: APP_ENCRYPTION_KEY must be set in production.');
    }
    if (!config.DATABASE_URL) {
      throw new Error('Environment validation failed: DATABASE_URL must be set in production.');
    }
  }

  return parsed.data;
}
