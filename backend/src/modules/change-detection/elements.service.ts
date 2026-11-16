import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElementProfileEntity } from '../../database/entities/element-profile.entity';
import { LocatorHistoryEntity } from '../../database/entities/locator-history.entity';
import { ProjectsService } from '../projects/projects.service';
import {
  AddLocatorDto,
  CreateElementProfileDto,
  UpdateElementProfileDto,
} from './dto/elements.dto';

@Injectable()
export class ElementsService {
  private readonly logger = new Logger(ElementsService.name);

  constructor(
    @InjectRepository(ElementProfileEntity)
    private readonly profileRepository: Repository<ElementProfileEntity>,
    @InjectRepository(LocatorHistoryEntity)
    private readonly locatorRepository: Repository<LocatorHistoryEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async createElementProfile(dto: CreateElementProfileDto, userId: string): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId);
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.profileRepository.findOne({
      where: { projectId: project.id, logicalId: dto.logical_id },
    });
    if (existing) {
      throw new ConflictException(
        `An element profile with logical_id '${dto.logical_id}' already exists in this project`,
      );
    }

    const profile = this.profileRepository.create({
      projectId: project.id,
      logicalId: dto.logical_id,
      description: dto.description,
      elementType: dto.element_type || 'button',
      pageContext: dto.page_context,
      originalText: dto.original_text,
      stableAttributes: dto.stable_attributes || {},
      structuralFingerprint: dto.structural_fingerprint || {},
    });
    const saved = await this.profileRepository.save(profile);

    // Seed initial locator
    const attrs = dto.stable_attributes || {};
    if (attrs['data-testid']) {
      const loc = this.locatorRepository.create({
        elementProfileId: saved.id,
        locatorType: 'stable_attribute',
        locatorValue: `[data-testid='${attrs['data-testid']}']`,
        successCount: 1,
      });
      await this.locatorRepository.save(loc);
    } else if (attrs['id']) {
      const loc = this.locatorRepository.create({
        elementProfileId: saved.id,
        locatorType: 'id',
        locatorValue: `#${attrs['id']}`,
        successCount: 1,
      });
      await this.locatorRepository.save(loc);
    }

    return this.formatProfile(saved);
  }

  async listElementProfiles(
    projectId: string | undefined,
    userId: string,
    isSuperuser = false,
  ): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const profiles = await this.profileRepository.find({
        where: { projectId: project.id },
        relations: ['locators'],
        order: { updatedAt: 'DESC' },
      });
      return profiles.map((p) => this.formatProfile(p));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];
    const projectIds = projects.map((p) => p.id);

    const profiles = await this.profileRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.locators', 'locators')
      .where('p.projectId IN (:...projectIds)', { projectIds })
      .orderBy('p.updatedAt', 'DESC')
      .getMany();

    return profiles.map((p) => this.formatProfile(p));
  }

  async getElementProfile(id: string, userId: string, isSuperuser = false): Promise<any> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['locators'],
    });
    if (!profile) throw new NotFoundException(`Element profile '${id}' not found`);

    await this.projectsService.verifyProjectAccess(profile.projectId, userId, isSuperuser);
    return this.formatProfile(profile);
  }

  async updateElementProfile(
    id: string,
    dto: UpdateElementProfileDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException(`Element profile '${id}' not found`);

    await this.projectsService.verifyProjectAccess(profile.projectId, userId, isSuperuser);

    if (dto.description !== undefined) profile.description = dto.description;
    if (dto.element_type !== undefined) profile.elementType = dto.element_type;
    if (dto.page_context !== undefined) profile.pageContext = dto.page_context;
    if (dto.original_text !== undefined) profile.originalText = dto.original_text;
    if (dto.stable_attributes !== undefined) profile.stableAttributes = dto.stable_attributes;
    if (dto.structural_fingerprint !== undefined) profile.structuralFingerprint = dto.structural_fingerprint;

    const saved = await this.profileRepository.save(profile);
    return this.formatProfile(saved);
  }

  async deleteElementProfile(id: string, userId: string, isSuperuser = false): Promise<void> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException(`Element profile '${id}' not found`);

    await this.projectsService.verifyProjectAccess(profile.projectId, userId, isSuperuser);
    await this.profileRepository.remove(profile);
  }

  async addLocator(
    profileId: string,
    dto: AddLocatorDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const profile = await this.profileRepository.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException(`Element profile '${profileId}' not found`);

    await this.projectsService.verifyProjectAccess(profile.projectId, userId, isSuperuser);

    const locator = this.locatorRepository.create({
      elementProfileId: profile.id,
      locatorType: dto.locator_type,
      locatorValue: dto.locator_value,
      successCount: 1,
    });
    return this.locatorRepository.save(locator);
  }

  private formatProfile(p: ElementProfileEntity) {
    return {
      id: p.id,
      project_id: p.projectId,
      logical_id: p.logicalId,
      description: p.description,
      element_type: p.elementType,
      page_context: p.pageContext,
      original_text: p.originalText,
      stable_attributes: p.stableAttributes || {},
      structural_fingerprint: p.structuralFingerprint || {},
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      locators: (p.locators || []).map((l) => ({
        id: l.id,
        locator_type: l.locatorType,
        locator_value: l.locatorValue,
        success_count: l.successCount,
        last_verified_at: l.lastVerifiedAt,
      })),
    };
  }
}
