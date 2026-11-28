import 'reflect-metadata';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { forceIpv4Dns } from '../common/network/force-ipv4-dns';
import { normalizeDatabaseUrl, shouldEnableDatabaseSsl } from './database.module';

forceIpv4Dns();

dotenv.config();

const rawUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/automation_platform_db';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: normalizeDatabaseUrl(rawUrl),
  ssl: shouldEnableDatabaseSsl(rawUrl, process.env.DATABASE_SSL)
    ? { rejectUnauthorized: false }
    : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [path.join(__dirname, 'entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
});
