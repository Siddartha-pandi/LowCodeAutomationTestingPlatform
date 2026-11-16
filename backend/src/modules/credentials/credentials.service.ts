import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialEntity } from '../../database/entities/credential.entity';
import { ProjectsService } from '../projects/projects.service';
import { CryptoVaultService } from './crypto-vault.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/credential.dto';

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,
    private readonly projectsService: ProjectsService,
    private readonly cryptoVault: CryptoVaultService,
  ) {}

  async listCredentials(projectId: string | undefined, userId: string, isSuperuser = false): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const creds = await this.credentialRepository.find({
        where: { projectId: project.id },
        order: { createdAt: 'ASC' },
      });
      return creds.map((c) => this.formatCredential(c));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];

    const projectIds = projects.map((p) => p.id);
    const creds = await this.credentialRepository
      .createQueryBuilder('c')
      .where('c.projectId IN (:...projectIds)', { projectIds })
      .orderBy('c.createdAt', 'ASC')
      .getMany();

    return creds.map((c) => this.formatCredential(c));
  }

  async getCredential(id: string, userId: string, isSuperuser = false): Promise<any> {
    const cred = await this.credentialRepository.findOne({ where: { id } });
    if (!cred) throw new NotFoundException(`Credential '${id}' not found`);

    await this.projectsService.verifyProjectAccess(cred.projectId, userId, isSuperuser);
    return this.formatCredential(cred);
  }

  async createCredential(dto: CreateCredentialDto, userId: string, isSuperuser = false): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project workspace not found');

    const encryptedSecret = this.cryptoVault.encryptSecret(dto.secret_value);

    const cred = this.credentialRepository.create({
      projectId: project.id,
      name: dto.name,
      credentialType: dto.credential_type || 'password',
      username: dto.username,
      secretEncrypted: encryptedSecret,
      domainScope: dto.domain_scope,
    });

    const saved = await this.credentialRepository.save(cred);
    return this.formatCredential(saved);
  }

  async updateCredential(
    id: string,
    dto: UpdateCredentialDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const cred = await this.credentialRepository.findOne({ where: { id } });
    if (!cred) throw new NotFoundException(`Credential '${id}' not found`);

    await this.projectsService.verifyProjectAccess(cred.projectId, userId, isSuperuser);

    if (dto.name !== undefined) cred.name = dto.name;
    if (dto.credential_type !== undefined) cred.credentialType = dto.credential_type;
    if (dto.username !== undefined) cred.username = dto.username;
    if (dto.domain_scope !== undefined) cred.domainScope = dto.domain_scope;

    if (dto.secret_value) {
      cred.secretEncrypted = this.cryptoVault.encryptSecret(dto.secret_value);
    }

    const saved = await this.credentialRepository.save(cred);
    return this.formatCredential(saved);
  }

  async deleteCredential(id: string, userId: string, isSuperuser = false): Promise<void> {
    const cred = await this.credentialRepository.findOne({ where: { id } });
    if (!cred) throw new NotFoundException(`Credential '${id}' not found`);

    await this.projectsService.verifyProjectAccess(cred.projectId, userId, isSuperuser);
    await this.credentialRepository.remove(cred);
  }

  // Internal helper for worker execution (never expose over HTTP controller)
  async getDecryptedSecret(id: string): Promise<string> {
    const cred = await this.credentialRepository.findOne({ where: { id } });
    if (!cred) throw new NotFoundException(`Credential '${id}' not found`);
    return this.cryptoVault.decryptSecret(cred.secretEncrypted);
  }

  private formatCredential(c: CredentialEntity): Record<string, any> {
    return {
      id: c.id,
      project_id: c.projectId,
      name: c.name,
      credential_type: c.credentialType,
      username: c.username,
      secret_value: '********', // Masked for security
      domain_scope: c.domainScope,
      created_at: c.createdAt?.toISOString?.() || c.createdAt,
    };
  }
}
