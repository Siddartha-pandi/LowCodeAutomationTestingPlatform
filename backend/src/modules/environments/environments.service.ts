import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { ProjectsService } from '../projects/projects.service';
import { CryptoVaultService } from '../credentials/crypto-vault.service';
import { CreateEnvironmentDto, UpdateEnvironmentDto } from './dto/environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepository: Repository<EnvironmentEntity>,
    private readonly projectsService: ProjectsService,
    private readonly cryptoVault: CryptoVaultService,
  ) {}

  async listEnvironments(projectId: string | undefined, userId: string, isSuperuser = false): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const envs = await this.environmentRepository.find({
        where: { projectId: project.id },
        order: { createdAt: 'ASC' },
      });
      return envs.map((e) => this.formatEnvironment(e));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];

    const projectIds = projects.map((p) => p.id);
    const envs = await this.environmentRepository
      .createQueryBuilder('env')
      .where('env.projectId IN (:...projectIds)', { projectIds })
      .orderBy('env.createdAt', 'ASC')
      .getMany();

    return envs.map((e) => this.formatEnvironment(e));
  }

  async getEnvironment(id: string, userId: string, isSuperuser = false): Promise<any> {
    const env = await this.environmentRepository.findOne({ where: { id } });
    if (!env) throw new NotFoundException(`Environment '${id}' not found`);

    await this.projectsService.verifyProjectAccess(env.projectId, userId, isSuperuser);
    return this.formatEnvironment(env);
  }

  async createEnvironment(dto: CreateEnvironmentDto, userId: string, isSuperuser = false): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project workspace not found');

    let variablesEncrypted: string | undefined;
    if (dto.variables && Object.keys(dto.variables).length > 0) {
      variablesEncrypted = this.cryptoVault.encryptSecret(JSON.stringify(dto.variables));
    }

    const env = this.environmentRepository.create({
      projectId: project.id,
      name: dto.name,
      baseUrl: dto.base_url,
      allowedDomains: dto.allowed_domains || [],
      variablesEncrypted,
    });

    const saved = await this.environmentRepository.save(env);
    return this.formatEnvironment(saved);
  }

  async updateEnvironment(
    id: string,
    dto: UpdateEnvironmentDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const env = await this.environmentRepository.findOne({ where: { id } });
    if (!env) throw new NotFoundException(`Environment '${id}' not found`);

    await this.projectsService.verifyProjectAccess(env.projectId, userId, isSuperuser);

    if (dto.name !== undefined) env.name = dto.name;
    if (dto.base_url !== undefined) env.baseUrl = dto.base_url;
    if (dto.allowed_domains !== undefined) env.allowedDomains = dto.allowed_domains;

    if (dto.variables !== undefined) {
      env.variablesEncrypted = this.cryptoVault.encryptSecret(JSON.stringify(dto.variables));
    }

    const saved = await this.environmentRepository.save(env);
    return this.formatEnvironment(saved);
  }

  async deleteEnvironment(id: string, userId: string, isSuperuser = false): Promise<void> {
    const env = await this.environmentRepository.findOne({ where: { id } });
    if (!env) throw new NotFoundException(`Environment '${id}' not found`);

    await this.projectsService.verifyProjectAccess(env.projectId, userId, isSuperuser);
    await this.environmentRepository.remove(env);
  }

  private formatEnvironment(e: EnvironmentEntity): Record<string, any> {
    let variables: Record<string, any> = {};
    if (e.variablesEncrypted) {
      try {
        const decrypted = this.cryptoVault.decryptSecret(e.variablesEncrypted);
        variables = JSON.parse(decrypted);
      } catch {
        variables = {};
      }
    }

    return {
      id: e.id,
      project_id: e.projectId,
      name: e.name,
      base_url: e.baseUrl,
      allowed_domains: e.allowedDomains || [],
      variables,
      created_at: e.createdAt?.toISOString?.() || e.createdAt,
    };
  }
}
