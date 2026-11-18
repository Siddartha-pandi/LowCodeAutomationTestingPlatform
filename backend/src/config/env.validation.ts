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
  return parsed.data;
}
