import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { ProjectMemberEntity } from '../../database/entities/project-member.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AddProjectMemberDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ProjectMemberEntity)
    private readonly memberRepository: Repository<ProjectMemberEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async listProjects(userId: string, isSuperuser = false): Promise<any[]> {
    if (isSuperuser) {
      const all = await this.projectRepository.find({ order: { createdAt: 'DESC' } });
      return all.map((p) => this.formatProject(p));
    }

    // Projects owned by user
    const owned = await this.projectRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });

    // Projects where user is a member
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ['project'],
    });

    const projectMap = new Map<string, ProjectEntity>();
    for (const p of owned) projectMap.set(p.id, p);
    for (const m of memberships) {
      if (m.project) projectMap.set(m.project.id, m.project);
    }

    return Array.from(projectMap.values()).map((p) => this.formatProject(p));
  }

  async getProject(projectId: string, userId: string, isSuperuser = false): Promise<any> {
    const project = await this.resolveProject(projectId, userId, isSuperuser);
    if (!project) throw new NotFoundException(`Project '${projectId}' not found`);
    return this.formatProject(project);
  }

  async createProject(dto: CreateProjectDto, ownerId: string): Promise<any> {
    const project = this.projectRepository.create({
      name: dto.name,
      description: dto.description,
      ownerId,
    });
    const saved = await this.projectRepository.save(project);

    // Add creator as admin member
    const member = this.memberRepository.create({
      projectId: saved.id,
      userId: ownerId,
      role: 'admin',
    });
    await this.memberRepository.save(member);

    return this.formatProject(saved);
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const project = await this.resolveProject(projectId, userId, isSuperuser);
    if (!project) throw new NotFoundException(`Project '${projectId}' not found`);

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;

    const saved = await this.projectRepository.save(project);
    return this.formatProject(saved);
  }

  async deleteProject(projectId: string, userId: string, isSuperuser = false): Promise<void> {
    const project = await this.resolveProject(projectId, userId, isSuperuser);
    if (!project) throw new NotFoundException(`Project '${projectId}' not found`);

    if (!isSuperuser && project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner or superadmin can delete a project.');
    }

    await this.projectRepository.remove(project);
  }

  async listMembers(projectId: string, userId: string, isSuperuser = false): Promise<any[]> {
    await this.verifyProjectAccess(projectId, userId, isSuperuser);

    const members = await this.memberRepository.find({
      where: { projectId },
      relations: ['user'],
    });

    return members.map((m) => ({
      id: m.id,
      project_id: m.projectId,
      user_id: m.userId,
      role: m.role,
      user_email: m.user?.email,
      user_name: m.user?.fullName,
      created_at: m.createdAt,
    }));
  }

  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
    callerUserId: string,
    isSuperuser = false,
  ): Promise<any> {
    await this.verifyProjectAccess(projectId, callerUserId, isSuperuser);

    const targetUser = await this.userRepository.findOne({ where: { id: dto.user_id } });
    if (!targetUser) throw new NotFoundException(`User with ID ${dto.user_id} not found`);

    const existing = await this.memberRepository.findOne({
      where: { projectId, userId: dto.user_id },
    });
    if (existing) {
      existing.role = dto.role;
      return this.memberRepository.save(existing);
    }

    const newMember = this.memberRepository.create({
      projectId,
      userId: dto.user_id,
      role: dto.role || 'viewer',
    });
    return this.memberRepository.save(newMember);
  }

  async removeMember(
    projectId: string,
    targetUserId: string,
    callerUserId: string,
    isSuperuser = false,
  ): Promise<void> {
    await this.verifyProjectAccess(projectId, callerUserId, isSuperuser);

    const member = await this.memberRepository.findOne({
      where: { projectId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Project member not found');

    await this.memberRepository.remove(member);
  }

  async userHasAccess(projectId: string, userId: string, isSuperuser = false): Promise<boolean> {
    if (isSuperuser) return true;
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;

    const member = await this.memberRepository.findOne({
      where: { projectId, userId },
    });
    return !!member;
  }

  async verifyProjectAccess(projectId: string, userId: string, isSuperuser = false): Promise<ProjectEntity> {
    const hasAccess = await this.userHasAccess(projectId, userId, isSuperuser);
    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to project '${projectId}'`);
    }
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async resolveProject(
    projectIdOrName: string | number | undefined,
    userId: string,
    isSuperuser = false,
  ): Promise<ProjectEntity | null> {
    if (!projectIdOrName || projectIdOrName === 'default' || projectIdOrName === '1' || projectIdOrName === 1) {
      const owned = await this.projectRepository.findOne({
        where: { ownerId: userId },
        order: { createdAt: 'ASC' },
      });
      if (owned) return owned;

      const member = await this.memberRepository.findOne({
        where: { userId },
        relations: ['project'],
      });
      if (member?.project) return member.project;

      if (isSuperuser) {
        return this.projectRepository.findOne({ order: { createdAt: 'ASC' } });
      }
      return null;
    }

    const strId = String(projectIdOrName);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strId);

    if (isUUID) {
      const p = await this.projectRepository.findOne({ where: { id: strId } });
      if (p) {
        const allowed = await this.userHasAccess(p.id, userId, isSuperuser);
        return allowed ? p : null;
      }
    }

    // Try finding by name
    const byName = await this.projectRepository.findOne({ where: { name: strId } });
    if (byName) {
      const allowed = await this.userHasAccess(byName.id, userId, isSuperuser);
      return allowed ? byName : null;
    }

    return null;
  }

  private formatProject(p: ProjectEntity): Record<string, any> {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      owner_id: p.ownerId,
      created_at: p.createdAt?.toISOString?.() || p.createdAt,
      updated_at: p.updatedAt?.toISOString?.() || p.updatedAt,
    };
  }
}
