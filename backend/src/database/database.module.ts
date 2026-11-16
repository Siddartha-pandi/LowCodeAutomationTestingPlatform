import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  return url.replace(/^postgresql\+psycopg:\/\//, 'postgresql://');
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawUrl = configService.get<string>('app.databaseUrl') || 'postgresql://postgres:postgres@localhost:5432/automation_platform_db';
        const url = normalizeDatabaseUrl(rawUrl);

        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: false, // MANDATORY: Schema is managed via versioned migrations
          logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
          extra: {
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
