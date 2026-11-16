import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async listUsers(): Promise<any[]> {
    const users = await this.userRepository.find({
      relations: ['roles'],
      order: { createdAt: 'ASC' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      is_active: u.isActive,
      is_superuser: u.isSuperuser,
      roles: (u.roles || []).map((r) => r.name),
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));
  }

  async getUser(id: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      is_active: user.isActive,
      is_superuser: user.isSuperuser,
      roles: (user.roles || []).map((r) => r.name),
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.full_name !== undefined) user.fullName = dto.full_name;
    if (dto.is_active !== undefined) user.isActive = dto.is_active;

    if (dto.role) {
      const targetRole = await this.roleRepository.findOne({ where: { name: dto.role } });
      if (targetRole) {
        user.roles = [targetRole];
      }
    }

    await this.userRepository.save(user);
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.remove(user);
  }

  async assignRole(userId: string, roleName: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

    if (!user.roles.some((r) => r.id === role.id)) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return this.getUser(userId);
  }

  async removeRole(userId: string, roleName: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    user.roles = user.roles.filter((r) => r.name !== roleName);
    await this.userRepository.save(user);

    return this.getUser(userId);
  }
}
