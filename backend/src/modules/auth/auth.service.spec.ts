import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { UserEntity } from '../../database/entities/user.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { ProjectEntity } from '../../database/entities/project.entity';

describe('AuthService (Integration & Unit)', () => {
  let service: AuthService;
  let userRepoMock: any;
  let roleRepoMock: any;
  let projectRepoMock: any;
  let passwordServiceMock: any;
  let jwtServiceMock: any;

  beforeEach(async () => {
    userRepoMock = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((entity) => ({ id: 'mock-user-uuid', ...entity })),
      save: jest.fn((entity) => Promise.resolve({ id: 'mock-user-uuid', ...entity })),
    };

    roleRepoMock = {
      findOne: jest.fn(),
      create: jest.fn((entity) => ({ id: 'mock-role-uuid', ...entity })),
      save: jest.fn((entity) => Promise.resolve({ id: 'mock-role-uuid', ...entity })),
    };

    projectRepoMock = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn((entity) => ({ id: 'mock-project-uuid', ...entity })),
      save: jest.fn((entity) => Promise.resolve({ id: 'mock-project-uuid', ...entity })),
    };

    passwordServiceMock = {
      hashPassword: jest.fn().mockResolvedValue('$2b$12$mockedHashedPassword'),
      verifyPassword: jest.fn(),
    };

    jwtServiceMock = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepoMock },
        { provide: getRepositoryToken(RoleEntity), useValue: roleRepoMock },
        { provide: getRepositoryToken(ProjectEntity), useValue: projectRepoMock },
        { provide: PasswordService, useValue: passwordServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-jwt-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register a new user and assign default role', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      userRepoMock.count.mockResolvedValue(0); // first user => owner
      roleRepoMock.findOne.mockResolvedValue({
        id: 'role-1',
        name: 'owner',
        permissions: ['*'],
      });

      const result = await service.register({
        email: 'admin@enterprise.test',
        password: 'Password123!',
        full_name: 'Admin User',
      });

      expect(result).toBeDefined();
      expect(result.token).toEqual('mock.jwt.token');
      expect(result.tokenResponse.access_token).toEqual('mock.jwt.token');
      expect(result.tokenResponse.user.email).toEqual('admin@enterprise.test');
      expect(userRepoMock.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      userRepoMock.findOne.mockResolvedValue({ id: 'existing-id', email: 'taken@test.com' });

      await expect(
        service.register({
          email: 'taken@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'dev@test.com',
        fullName: 'Dev User',
        isActive: true,
        isSuperuser: false,
        passwordHash: '$2b$12$hashed',
        userRoles: [
          {
            role: {
              name: 'developer',
              permissions: ['flows:execute'],
            },
          },
        ],
      };

      userRepoMock.findOne.mockResolvedValue(mockUser);
      passwordServiceMock.verifyPassword.mockResolvedValue(true);

      const result = await service.login({
        email: 'dev@test.com',
        password: 'correct-password',
      });

      expect(result).toBeDefined();
      expect(result.token).toEqual('mock.jwt.token');
      expect(result.tokenResponse.user.email).toEqual('dev@test.com');
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'dev@test.com',
        isActive: true,
        passwordHash: '$2b$12$hashed',
      };

      userRepoMock.findOne.mockResolvedValue(mockUser);
      passwordServiceMock.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'dev@test.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is disabled', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'disabled@test.com',
        isActive: false,
        passwordHash: '$2b$12$hashed',
      };

      userRepoMock.findOne.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'disabled@test.com',
          password: 'any-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
