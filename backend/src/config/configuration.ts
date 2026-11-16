import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || process.env.AUTOMATION_SERVICE_PORT || '8000', 10),
  jwtSecret: process.env.JWT_SECRET || 'enterprise-production-jwt-secret-key-32chars',
  tokenExpiryMinutes: parseInt(process.env.TOKEN_EXPIRY_MINUTES || '480', 10),
  appEncryptionKey:
    process.env.APP_ENCRYPTION_KEY ||
    process.env.CREDENTIALS_MASTER_KEY ||
    'enterprise-master-encryption-key-32chars',
  internalServiceKey:
    process.env.INTERNAL_SERVICE_KEY || 'enterprise-internal-secret-service-key-32chars',
  storageDir:
    process.env.STORAGE_DIR ||
    (process.platform === 'win32'
      ? 'C:\\Prama\\AutomationTestingWithAgentBrowser\\reports'
      : '/app/reports'),
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  defaultTimeoutMs: parseInt(process.env.BROWSER_TIMEOUT_MS || '30000', 10),
  allowedDomains: process.env.ALLOWED_DOMAINS
    ? process.env.ALLOWED_DOMAINS.split(',').map((d) => d.trim()).filter(Boolean)
    : ['localhost', '127.0.0.1', '*.company.internal', '*.company.local'],
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/automation_platform_db',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  },
  zeroAiPolicyEnforced: process.env.ZERO_AI_POLICY_ENFORCED !== 'false',
}));
