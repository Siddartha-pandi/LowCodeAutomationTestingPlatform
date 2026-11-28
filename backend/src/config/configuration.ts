import { registerAs } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseRedisConfig } from '../common/network/redis-options';

// Ephemeral per-process fallback used ONLY in local dev/test when env vars are omitted.
// Production startup validation (env.validation.ts) strictly rejects missing secrets.
const EPHEMERAL_DEV_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const EPHEMERAL_DEV_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const EPHEMERAL_DEV_INTERNAL_KEY = crypto.randomBytes(32).toString('hex');

export function resolveStorageDir(rawStorageDir?: string): string {
  const candidate = rawStorageDir || process.env.STORAGE_DIR;
  if (candidate) {
    // Handle Dev Container /workspaces/... path gracefully when running locally on host
    if (candidate.startsWith('/workspaces/') && !fs.existsSync('/workspaces')) {
      return path.resolve(process.cwd(), 'storage');
    }
    return path.resolve(candidate);
  }
  if (process.platform === 'win32') {
    return 'C:\\Prama\\AutomationTestingWithAgentBrowser\\reports';
  }
  return path.resolve(process.cwd(), 'storage');
}

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || process.env.AUTOMATION_SERVICE_PORT || '8000', 10),
  jwtSecret: process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || EPHEMERAL_DEV_JWT_SECRET,
  tokenExpiryMinutes: parseInt(process.env.TOKEN_EXPIRY_MINUTES || '480', 10),
  appEncryptionKey:
    process.env.APP_ENCRYPTION_KEY ||
    process.env.CREDENTIALS_MASTER_KEY ||
    EPHEMERAL_DEV_ENCRYPTION_KEY,
  internalServiceKey:
    process.env.INTERNAL_SERVICE_KEY || EPHEMERAL_DEV_INTERNAL_KEY,
  storageDir: resolveStorageDir(),
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
  databaseSsl: process.env.DATABASE_SSL === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  trustProxy: process.env.TRUST_PROXY !== 'false',
  cookie: {
    sameSite: (['lax', 'strict', 'none'].includes((process.env.COOKIE_SAME_SITE || '').toLowerCase())
      ? (process.env.COOKIE_SAME_SITE || '').toLowerCase()
      : 'lax') as 'lax' | 'strict' | 'none',
    secure:
      process.env.COOKIE_SECURE === 'true'
        ? true
        : process.env.COOKIE_SECURE === 'false'
          ? false
          : (process.env.COOKIE_SAME_SITE || '').toLowerCase() === 'none' ||
            process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  redis: parseRedisConfig(process.env),
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  },
  zeroAiPolicyEnforced: process.env.ZERO_AI_POLICY_ENFORCED !== 'false',
}));
