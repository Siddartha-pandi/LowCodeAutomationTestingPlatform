import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import dns from 'node:dns';
import * as path from 'node:path';

// Force Node.js to prefer IPv4 over IPv6. Prevents ETIMEDOUT on networks
// without IPv6 routes when DNS returns both IPv6 and IPv4 addresses for cloud databases like Neon.
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

export function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  let normalized = url.replace(/^postgresql\+psycopg:\/\//, 'postgresql://');
  // Remove sslmode query param so it doesn't conflict with TypeORM's explicit ssl config
  normalized = normalized.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  return normalized;
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawUrl = configService.get<string>('app.databaseUrl');
        if (!rawUrl) throw new Error('DATABASE_URL is not set. Please configure it in your .env file.');
        const url = normalizeDatabaseUrl(rawUrl);

        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize:
            process.env.NODE_ENV === 'production'
              ? false
              : process.env.DB_SYNCHRONIZE !== 'false', // Never synchronize schema in production; use migrations
          migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
          migrationsRun: process.env.RUN_MIGRATIONS === 'true',
          migrationsTableName: 'typeorm_migrations',
          logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
          retryAttempts: 10,
          retryDelay: 3000,
          extra: {
            max: 10,                       // Neon free tier: keep pool small
            idleTimeoutMillis: 30000,      // Release idle connections after 30s
            connectionTimeoutMillis: 20000, // Give Neon cold start sufficient time to spin up
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
