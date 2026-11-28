export interface ParsedRedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls: boolean;
}

/**
 * Parses Redis connection settings from REDIS_URL (redis:// or rediss://) with
 * fallback to discrete REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_DB / REDIS_TLS vars.
 */
export function parseRedisConfig(env: NodeJS.ProcessEnv = process.env): ParsedRedisConfig {
  const rawUrl = env.REDIS_URL?.trim();
  if (rawUrl) {
    const parsed = new URL(rawUrl);
    const isTls =
      parsed.protocol === 'rediss:' ||
      env.REDIS_TLS === 'true' ||
      parsed.searchParams.get('tls') === 'true';
    const dbMatch = parsed.pathname.match(/^\/(\d+)/);
    const db = dbMatch ? parseInt(dbMatch[1], 10) : parseInt(env.REDIS_DB || '0', 10);

    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : env.REDIS_USERNAME || undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : env.REDIS_PASSWORD || undefined,
      db: Number.isNaN(db) ? 0 : db,
      tls: isTls,
    };
  }

  return {
    host: env.REDIS_HOST || '127.0.0.1',
    port: parseInt(env.REDIS_PORT || '6379', 10),
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    db: parseInt(env.REDIS_DB || '0', 10),
    tls: env.REDIS_TLS === 'true',
  };
}

export function buildRedisConnectionOptions(
  redisConfig: Partial<ParsedRedisConfig> | undefined,
  overrides: Record<string, unknown> = {},
): Record<string, any> {
  const cfg = redisConfig || {};
  const opts: Record<string, any> = {
    host: cfg.host || '127.0.0.1',
    port: cfg.port || 6379,
    db: cfg.db ?? 0,
    ...overrides,
  };

  if (cfg.username) {
    opts.username = cfg.username;
  }
  if (cfg.password) {
    opts.password = cfg.password;
  }
  if (cfg.tls) {
    opts.tls = {};
  }

  return opts;
}
