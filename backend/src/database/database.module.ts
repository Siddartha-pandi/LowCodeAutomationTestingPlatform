import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import { forceIpv4Dns } from '../common/network/force-ipv4-dns';

forceIpv4Dns();

export function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  let normalized = url.replace(/^postgresql\+psycopg:\/\//, 'postgresql://');
  // Remove sslmode query param so it doesn't conflict with TypeORM's explicit ssl config
  normalized = normalized.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  return normalized;
}

export function shouldEnableDatabaseSsl(rawUrl: string, databaseSslFlag?: boolean | string): boolean {
  if (databaseSslFlag === true || databaseSslFlag === 'true') {
    return true;
  }
  if (rawUrl && /[?&]sslmode=(require|verify-ca|verify-full|no-verify)\b/i.test(rawUrl)) {
    return true;
  }
  return false;
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
        const sslEnabled = shouldEnableDatabaseSsl(
          rawUrl,
          configService.get<boolean>('app.databaseSsl') || process.env.DATABASE_SSL,
        );

        return {
          type: 'postgres',
          url,
          entities: [path.join(__dirname, 'entities/*.entity{.ts,.js}')],
          autoLoadEntities: true,
          synchronize:
            process.env.NODE_ENV === 'production'
              ? false
              : process.env.DB_SYNCHRONIZE !== 'false', // Never synchronize schema in production; use migrations
          migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
          migrationsRun: process.env.RUN_MIGRATIONS === 'true',
          migrationsTableName: 'typeorm_migrations',
          logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
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
