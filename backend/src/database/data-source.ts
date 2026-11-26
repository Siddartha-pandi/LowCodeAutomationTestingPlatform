import 'reflect-metadata';
import * as dns from 'node:dns';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { normalizeDatabaseUrl } from './database.module';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

const rawUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/automation_platform_db';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: normalizeDatabaseUrl(rawUrl),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [path.join(__dirname, 'entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
});

export default AppDataSource;
