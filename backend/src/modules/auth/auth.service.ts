import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../../database/entities/user.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { PasswordService } from './password.service';
import { LoginDto, RegisterDto, TokenResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ tokenResponse: TokenResponseDto; token: string }> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const userCount = await this.userRepository.count();
    const isFirstUser = userCount === 0;
    const defaultRoleName = isFirstUser ? 'owner' : 'developer';

    let role = await this.roleRepository.findOne({ where: { name: defaultRoleName } });
    if (!role) {
      // Seed default role on the fly if not yet present
      role = this.roleRepository.create({
        name: defaultRoleName,
        description: isFirstUser ? 'Tenant Owner' : 'Automation Developer',
        permissions: isFirstUser ? ['*'] : ['flows:create_edit', 'flows:execute', 'tests:create_edit', 'tests:execute', 'reports:read'],
      });
      await this.roleRepository.save(role);
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const fullName = dto.full_name || email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);

    const newUser = this.userRepository.create({
      email,
      passwordHash,
      fullName,
      isActive: true,
      isSuperuser: isFirstUser,
      roles: [role],
    });

    const savedUser = await this.userRepository.save(newUser);

    // Create default workspace for user
    const defaultWorkspace = this.projectRepository.create({
      name: `${email.split('@')[0]}'s workspace`,
      description: 'Default personal workspace',
      ownerId: savedUser.id,
    });
    await this.projectRepository.save(defaultWorkspace);

    const token = this.generateToken(savedUser);
    return {
      token,
      tokenResponse: {
        access_token: token,
        token_type: 'bearer',
        user: this.formatUser(savedUser),
      },
    };
  }

  async login(dto: LoginDto): Promise<{ tokenResponse: TokenResponseDto; token: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.passwordService.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(user);
    return {
      token,
      tokenResponse: {
        access_token: token,
        token_type: 'bearer',
        user: this.formatUser(user),
      },
    };
  }

  async getProfile(userId: string): Promise<Record<string, any>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  private generateToken(user: UserEntity): string {
    const permissions = new Set<string>();
    if (user.isSuperuser) {
      permissions.add('*');
    } else {
      for (const role of user.roles || []) {
        for (const p of role.permissions || []) {
          permissions.add(p);
        }
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roles: (user.roles || []).map((r) => r.name),
      permissions: Array.from(permissions),
    };

    return this.jwtService.sign(payload);
  }

  formatUser(user: UserEntity): Record<string, any> {
    const permissions = new Set<string>();
    if (user.isSuperuser) {
      permissions.add('*');
    } else {
      for (const role of user.roles || []) {
        for (const p of role.permissions || []) {
          permissions.add(p);
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      is_active: user.isActive,
      is_superuser: user.isSuperuser,
      roles: (user.roles || []).map((r) => r.name),
      permissions: Array.from(permissions),
      created_at: user.createdAt?.toISOString?.() || user.createdAt,
    };
  }
}
