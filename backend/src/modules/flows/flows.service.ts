import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { ProjectsService } from '../projects/projects.service';
import { QueueService } from '../../queue/queue.service';
import { FlowExecutorService } from './flow-executor.service';
import { computeDefinitionChecksum } from './flow-checksum';
import { CreateFlowDto, ExecuteFlowDto, UpdateFlowDto } from './dto/flow.dto';

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    @InjectRepository(AutomationDefinitionEntity)
    private readonly definitionRepository: Repository<AutomationDefinitionEntity>,
    @InjectRepository(DefinitionVersionEntity)
    private readonly versionRepository: Repository<DefinitionVersionEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepository: Repository<EnvironmentEntity>,
    private readonly projectsService: ProjectsService,
    private readonly queueService: QueueService,
    private readonly flowExecutor: FlowExecutorService,
  ) {}

  async listFlows(projectId: string | undefined, userId: string, isSuperuser = false): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const definitions = await this.definitionRepository.find({
        where: { projectId: project.id, type: 'flow' },
        order: { updatedAt: 'DESC' },
      });
      return Promise.all(definitions.map((d) => this.formatFlow(d)));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];
    const projectIds = projects.map((p) => p.id);

    const definitions = await this.definitionRepository
      .createQueryBuilder('d')
      .where('d.projectId IN (:...projectIds)', { projectIds })
      .andWhere('d.type = :type', { type: 'flow' })
      .orderBy('d.updatedAt', 'DESC')
      .getMany();

    return Promise.all(definitions.map((d) => this.formatFlow(d)));
  }

  async getFlow(id: string, userId: string, isSuperuser = false): Promise<any> {
    const flow = await this.definitionRepository.findOne({ where: { id } });
    if (!flow || flow.type !== 'flow') throw new NotFoundException(`Flow '${id}' not found`);

    await this.projectsService.verifyProjectAccess(flow.projectId, userId, isSuperuser);
    return this.formatFlow(flow);
  }

  async createFlow(dto: CreateFlowDto, userId: string, isSuperuser = false): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project workspace not found');

    const graphDef = dto.definition || dto.flow_graph || {
      nodes: [
        { id: 'node-start', type: 'start', config: {} },
        { id: 'node-end', type: 'end', config: {} },
      ],
      edges: [{ source: 'node-start', target: 'node-end' }],
    };

    const checksum = computeDefinitionChecksum(graphDef);

    const flow = this.definitionRepository.create({
      projectId: project.id,
      name: dto.name,
      description: dto.description,
      type: 'flow',
      status: 'draft',
      createdBy: userId,
    });
    const savedFlow = await this.definitionRepository.save(flow);

    const initialVersion = this.versionRepository.create({
      definitionId: savedFlow.id,
      versionNum: 1,
      definitionJson: graphDef,
      checksumSha256: checksum,
      isPublished: false,
    });
    const savedVersion = await this.versionRepository.save(initialVersion);

    savedFlow.currentVersionId = savedVersion.id;
    await this.definitionRepository.save(savedFlow);

    return this.formatFlow(savedFlow);
  }

  async updateFlow(
    id: string,
    dto: UpdateFlowDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const flow = await this.definitionRepository.findOne({ where: { id } });
    if (!flow || flow.type !== 'flow') throw new NotFoundException(`Flow '${id}' not found`);

    await this.projectsService.verifyProjectAccess(flow.projectId, userId, isSuperuser);

    if (dto.name !== undefined) flow.name = dto.name;
    if (dto.description !== undefined) flow.description = dto.description;

    const graphDef = dto.definition || dto.flow_graph;
    if (graphDef) {
      const checksum = computeDefinitionChecksum(graphDef);
      let currentVersion: DefinitionVersionEntity | null = null;
      if (flow.currentVersionId) {
        currentVersion = await this.versionRepository.findOne({ where: { id: flow.currentVersionId } });
      }

      if (currentVersion && !currentVersion.isPublished) {
        // Update draft version in place
        currentVersion.definitionJson = graphDef;
        currentVersion.checksumSha256 = checksum;
        await this.versionRepository.save(currentVersion);
      } else {
        // If current version was published, create new draft version increment
        const lastVersion = await this.versionRepository.findOne({
          where: { definitionId: flow.id },
          order: { versionNum: 'DESC' },
        });
        const nextNum = (lastVersion?.versionNum || 0) + 1;
        const newVersion = this.versionRepository.create({
          definitionId: flow.id,
          versionNum: nextNum,
          definitionJson: graphDef,
          checksumSha256: checksum,
          isPublished: false,
        });
        const savedNew = await this.versionRepository.save(newVersion);
        flow.currentVersionId = savedNew.id;
      }
    }

    await this.definitionRepository.save(flow);
    return this.formatFlow(flow);
  }

  async deleteFlow(id: string, userId: string, isSuperuser = false): Promise<void> {
    const flow = await this.definitionRepository.findOne({ where: { id } });
    if (!flow || flow.type !== 'flow') throw new NotFoundException(`Flow '${id}' not found`);

    await this.projectsService.verifyProjectAccess(flow.projectId, userId, isSuperuser);
    await this.definitionRepository.remove(flow);
  }

  async publishFlow(id: string, userId: string, isSuperuser = false): Promise<any> {
    const flow = await this.definitionRepository.findOne({ where: { id } });
    if (!flow || flow.type !== 'flow') throw new NotFoundException(`Flow '${id}' not found`);

    await this.projectsService.verifyProjectAccess(flow.projectId, userId, isSuperuser);

    let activeVersion: DefinitionVersionEntity | null = null;
    if (flow.currentVersionId) {
      activeVersion = await this.versionRepository.findOne({ where: { id: flow.currentVersionId } });
    }

    if (!activeVersion) {
      throw new BadRequestException('Flow has no valid version definition to publish.');
    }

    activeVersion.isPublished = true;
    activeVersion.publishedBy = userId;
    activeVersion.publishedAt = new Date();
    await this.versionRepository.save(activeVersion);

    flow.status = 'published';
    await this.definitionRepository.save(flow);

    return {
      status: 'published',
      flow_id: flow.id,
      version_id: activeVersion.id,
      version_num: activeVersion.versionNum,
      checksum: activeVersion.checksumSha256,
      published_at: activeVersion.publishedAt,
    };
  }

  async executeFlow(
    id: string,
    dto: ExecuteFlowDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const flow = await this.definitionRepository.findOne({ where: { id } });
    if (!flow || flow.type !== 'flow') throw new NotFoundException(`Flow '${id}' not found`);

    await this.projectsService.verifyProjectAccess(flow.projectId, userId, isSuperuser);

    let targetVersion: DefinitionVersionEntity | null = null;
    if (dto.version_id) {
      targetVersion = await this.versionRepository.findOne({ where: { id: dto.version_id } });
    } else if (flow.currentVersionId) {
      targetVersion = await this.versionRepository.findOne({ where: { id: flow.currentVersionId } });
    }

    if (!targetVersion) {
      throw new BadRequestException('Flow has no runnable definition version.');
    }

    // Resolve domain allowlist
    let allowedDomains = ['*'];
    if (dto.environment_id) {
      const env = await this.environmentRepository.findOne({ where: { id: dto.environment_id } });
      if (env && env.allowedDomains && env.allowedDomains.length > 0) {
        allowedDomains = env.allowedDomains;
      }
    }

    // 1. Create Execution record in PostgreSQL
    const execution = this.executionRepository.create({
      projectId: flow.projectId,
      definitionId: flow.id,
      definitionVersionId: targetVersion.id,
      environmentId: dto.environment_id,
      triggerType: 'manual',
      triggeredBy: userId,
      status: 'queued',
      summary: {
        flow_name: flow.name,
        version_num: targetVersion.versionNum,
      },
    });

    const savedExecution = await this.executionRepository.save(execution);

    // 2. Dispatch BullMQ Execution Job
    await this.queueService.addExecutionJob({
      execution_id: savedExecution.id,
      project_id: flow.projectId,
      environment_id: dto.environment_id,
      user_id: userId,
      flow_id: flow.id,
      browser_config: {
        browser_type: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 800 },
        record_video: false,
        record_trace: true,
        timeout_ms: 30000,
      },
      allowed_domains: allowedDomains,
      variables: dto.initial_variables || {},
      graph_definition: targetVersion.definitionJson as any,
      correlation_id: `corr-${savedExecution.id}`,
    });

    return {
      execution_id: savedExecution.id,
      id: savedExecution.id,
      status: 'queued',
      flow_id: flow.id,
      flow_name: flow.name,
      created_at: savedExecution.createdAt,
    };
  }

  validateGraphDefinition(definition: any) {
    return this.flowExecutor.validateGraph(definition);
  }

  getTemplates(): any[] {
    return [
      {
        id: 'tpl-web-login',
        name: 'Standard Form Authentication Flow',
        description: 'Navigates to URL, fills username/password, and asserts dashboard heading visibility.',
        category: 'Authentication',
        flow_graph: {
          nodes: [
            { id: 'start', type: 'start', config: {} },
            { id: 'nav', type: 'navigate', config: { url: 'https://example.com/login' } },
            { id: 'user', type: 'fill', config: { selector: 'input[name="username"]', text: '{{username}}' } },
            { id: 'pass', type: 'fill', config: { selector: 'input[name="password"]', text: '{{password}}' } },
            { id: 'submit', type: 'click', config: { selector: 'button[type="submit"]' } },
            { id: 'assert', type: 'element_visible', config: { selector: 'h1.dashboard' } },
            { id: 'end', type: 'end', config: {} },
          ],
          edges: [
            { source: 'start', target: 'nav' },
            { source: 'nav', target: 'user' },
            { source: 'user', target: 'pass' },
            { source: 'pass', target: 'submit' },
            { source: 'submit', target: 'assert' },
            { source: 'assert', target: 'end' },
          ],
        },
      },
      {
        id: 'tpl-health-check',
        name: 'Page Title & Status Smoke Test',
        description: 'Performs navigation and verifies page URL and document title.',
        category: 'Smoke Testing',
        flow_graph: {
          nodes: [
            { id: 'start', type: 'start', config: {} },
            { id: 'nav', type: 'navigate', config: { url: 'https://example.com' } },
            { id: 'assert-title', type: 'title_equals', config: { expected: 'Example Domain' } },
            { id: 'end', type: 'end', config: {} },
          ],
          edges: [
            { source: 'start', target: 'nav' },
            { source: 'nav', target: 'assert-title' },
            { source: 'assert-title', target: 'end' },
          ],
        },
      },
    ];
  }

  private async formatFlow(flow: AutomationDefinitionEntity): Promise<Record<string, any>> {
    let activeVersion: DefinitionVersionEntity | null = null;
    if (flow.currentVersionId) {
      activeVersion = await this.versionRepository.findOne({ where: { id: flow.currentVersionId } });
    }

    return {
      id: flow.id,
      project_id: flow.projectId,
      name: flow.name,
      description: flow.description,
      type: flow.type,
      status: flow.status,
      current_version_id: flow.currentVersionId,
      definition: activeVersion?.definitionJson || null,
      flow_graph: activeVersion?.definitionJson || null,
      version_num: activeVersion?.versionNum || 1,
      is_published: activeVersion?.isPublished || false,
      checksum: activeVersion?.checksumSha256 || null,
      created_at: flow.createdAt?.toISOString?.() || flow.createdAt,
      updated_at: flow.updatedAt?.toISOString?.() || flow.updatedAt,
    };
  }
}
