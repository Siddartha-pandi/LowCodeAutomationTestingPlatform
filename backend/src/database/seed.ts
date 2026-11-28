import { forceIpv4Dns } from '../common/network/force-ipv4-dns';

forceIpv4Dns();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { EnvironmentEntity } from './entities/environment.entity';

dotenv.config();

const DEFAULT_ROLES = [
  {
    name: 'owner',
    description: 'Tenant Owner with full administrative control and key management',
    permissions: ['*'],
  },
  {
    name: 'admin',
    description: 'System Administrator with project, user, and credential management rights',
    permissions: [
      'projects:manage', 'users:manage', 'roles:manage', 'credentials:manage',
      'environments:manage', 'flows:create_edit', 'flows:publish', 'flows:execute',
      'tests:create_edit', 'tests:publish', 'tests:execute', 'reports:read',
      'healing:approve', 'audit:read', 'schedules:manage',
    ],
  },
  {
    name: 'lead_qa',
    description: 'QA Lead with test authoring, flow execution, and self-healing approval rights',
    permissions: [
      'flows:create_edit', 'flows:publish', 'flows:execute',
      'tests:create_edit', 'tests:publish', 'tests:execute', 'reports:read',
      'healing:approve', 'schedules:manage',
    ],
  },
  {
    name: 'developer',
    description: 'Automation Engineer with flow authoring and execution rights',
    permissions: [
      'flows:create_edit', 'flows:execute',
      'tests:create_edit', 'tests:execute', 'reports:read',
    ],
  },
  {
    name: 'viewer',
    description: 'Read-only auditor with dashboard and report access',
    permissions: ['flows:read', 'tests:read', 'reports:read'],
  },
];

async function seed() {
  const dbUrl = (process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/automation_platform_db')
    .replace('postgresql+psycopg://', 'postgresql://');

  const shouldSync = process.env.DB_SYNCHRONIZE !== 'false';
  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
    entities: [RoleEntity, UserEntity, UserRoleEntity, ProjectEntity, ProjectMemberEntity, EnvironmentEntity],
    synchronize: shouldSync,
  });

  await dataSource.initialize();
  console.log('Connected to database for tenant seeding...');

  const roleRepo = dataSource.getRepository(RoleEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const userRoleRepo = dataSource.getRepository(UserRoleEntity);
  const projectRepo = dataSource.getRepository(ProjectEntity);
  const memberRepo = dataSource.getRepository(ProjectMemberEntity);

  // 1. Seed Roles
  console.log('Seeding enterprise RBAC roles...');
  const roleMap: Record<string, RoleEntity> = {};
  for (const r of DEFAULT_ROLES) {
    let existing = await roleRepo.findOne({ where: { name: r.name } });
    if (!existing) {
      existing = roleRepo.create({
        name: r.name,
        description: r.description,
        permissions: r.permissions,
      });
      existing = await roleRepo.save(existing);
    } else {
      existing.permissions = r.permissions;
      existing = await roleRepo.save(existing);
    }
    roleMap[r.name] = existing;
  }

  // 2. Default Admin User setup (only if ADMIN_EMAIL is explicitly provided in environment)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPass) {
    let admin = await userRepo.findOne({ where: { email: adminEmail } });
    if (!admin) {
      console.log(`Creating initial admin user (${adminEmail})...`);
      const hashed = await bcrypt.hash(adminPass, 12);
      admin = userRepo.create({
        email: adminEmail,
        passwordHash: hashed,
        fullName: 'System Administrator',
        isActive: true,
        isSuperuser: true,
      });
      admin = await userRepo.save(admin);

      if (roleMap['admin']) {
        const ur = userRoleRepo.create({ userId: admin.id, roleId: roleMap['admin'].id });
        await userRoleRepo.save(ur);
      }
      console.log(`Admin account created with ID: ${admin.id}`);
    }
  }

  await dataSource.destroy();
  console.log('Seeding completed successfully.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
