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
import { TestDatasetEntity } from '../../database/entities/test-dataset.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { ProjectsService } from '../projects/projects.service';
import { QueueService } from '../../queue/queue.service';
import { computeDefinitionChecksum } from '../flows/flow-checksum';
import {
  CreateTestCaseDto,
  ExecuteTestCaseDto,
  UpdateTestCaseDto,
} from './dto/test-case.dto';
import { CreateDatasetDto, UpdateDatasetDto } from './dto/dataset.dto';

export function testCaseToGraphDefinition(testCase: any): Record<string, any> {
  const setupSteps = testCase.setup_steps || [];
  const mainSteps = testCase.steps || [];
  const teardownSteps = testCase.teardown_steps || [];
  const allSteps = [...setupSteps, ...mainSteps, ...teardownSteps];

  const nodes: any[] = [{ id: 'node-start', type: 'start', config: {} }];
  const edges: any[] = [];
  let prevNodeId = 'node-start';

  for (let i = 0; i < allSteps.length; i++) {
    const step = allSteps[i];
    const nodeId = step.id || `step-${i + 1}`;
    const nodeType =
      step.step_type === 'action' && step.action
        ? step.action
        : step.assertion || 'element_visible';

    const nodeConfig: Record<string, any> = { ...(step.config || {}) };
    if (step.target) {
      Object.assign(nodeConfig, step.target);
    }
    if (step.expected !== undefined) {
      nodeConfig.expected = step.expected;
      nodeConfig.expected_text = step.expected;
      nodeConfig.value = step.expected;
    }
    if (step.attribute_name) nodeConfig.attribute_name = step.attribute_name;
    if (step.retries) nodeConfig.max_retries = step.retries;
    if (step.on_failure === 'continue') nodeConfig.continue_on_failure = true;

    nodes.push({ id: nodeId, type: nodeType, action: nodeType, config: nodeConfig });
    edges.push({ source: prevNodeId, target: nodeId });
    prevNodeId = nodeId;
  }

  nodes.push({ id: 'node-end', type: 'end', config: {} });
  edges.push({ source: prevNodeId, target: 'node-end' });

  return { nodes, edges };
}

@Injectable()
export class TestCasesService {
  private readonly logger = new Logger(TestCasesService.name);

  constructor(
    @InjectRepository(AutomationDefinitionEntity)
    private readonly definitionRepository: Repository<AutomationDefinitionEntity>,
    @InjectRepository(DefinitionVersionEntity)
    private readonly versionRepository: Repository<DefinitionVersionEntity>,
    @InjectRepository(TestDatasetEntity)
    private readonly datasetRepository: Repository<TestDatasetEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepository: Repository<EnvironmentEntity>,
    private readonly projectsService: ProjectsService,
    private readonly queueService: QueueService,
  ) {}

  // ---------------------------------------------------------------------------
  // Test Cases CRUD
  // ---------------------------------------------------------------------------

  async listTestCases(projectId: string | undefined, userId: string, isSuperuser = false): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const tests = await this.definitionRepository.find({
        where: { projectId: project.id, type: 'test' },
        order: { updatedAt: 'DESC' },
      });
      return Promise.all(tests.map((t) => this.formatTestCase(t)));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];
    const projectIds = projects.map((p) => p.id);

    const tests = await this.definitionRepository
      .createQueryBuilder('d')
      .where('d.projectId IN (:...projectIds)', { projectIds })
      .andWhere('d.type = :type', { type: 'test' })
      .orderBy('d.updatedAt', 'DESC')
      .getMany();

    return Promise.all(tests.map((t) => this.formatTestCase(t)));
  }

  async getTestCase(id: string, userId: string, isSuperuser = false): Promise<any> {
    const test = await this.definitionRepository.findOne({ where: { id } });
    if (!test || test.type !== 'test') throw new NotFoundException(`Test Case '${id}' not found`);

    await this.projectsService.verifyProjectAccess(test.projectId, userId, isSuperuser);
    return this.formatTestCase(test);
  }

  async createTestCase(dto: CreateTestCaseDto, userId: string, isSuperuser = false): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project workspace not found');

    const testDef = dto.test_case || {
      name: dto.name,
      setup_steps: [],
      steps: [],
      teardown_steps: [],
    };
    const checksum = computeDefinitionChecksum(testDef);

    const test = this.definitionRepository.create({
      projectId: project.id,
      name: dto.name,
      description: dto.description,
      type: 'test',
      status: 'draft',
      createdBy: userId,
    });
    const savedTest = await this.definitionRepository.save(test);

    const initialVersion = this.versionRepository.create({
      definitionId: savedTest.id,
      versionNum: 1,
      definitionJson: testDef,
      checksumSha256: checksum,
      isPublished: false,
    });
    const savedVersion = await this.versionRepository.save(initialVersion);

    savedTest.currentVersionId = savedVersion.id;
    await this.definitionRepository.save(savedTest);

    return this.formatTestCase(savedTest);
  }

  async updateTestCase(
    id: string,
    dto: UpdateTestCaseDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const test = await this.definitionRepository.findOne({ where: { id } });
    if (!test || test.type !== 'test') throw new NotFoundException(`Test Case '${id}' not found`);

    await this.projectsService.verifyProjectAccess(test.projectId, userId, isSuperuser);

    if (dto.name !== undefined) test.name = dto.name;
    if (dto.description !== undefined) test.description = dto.description;

    if (dto.test_case) {
      const checksum = computeDefinitionChecksum(dto.test_case);
      let currentVersion: DefinitionVersionEntity | null = null;
      if (test.currentVersionId) {
        currentVersion = await this.versionRepository.findOne({ where: { id: test.currentVersionId } });
      }

      if (currentVersion && !currentVersion.isPublished) {
        currentVersion.definitionJson = dto.test_case;
        currentVersion.checksumSha256 = checksum;
        await this.versionRepository.save(currentVersion);
      } else {
        const lastVersion = await this.versionRepository.findOne({
          where: { definitionId: test.id },
          order: { versionNum: 'DESC' },
        });
        const nextNum = (lastVersion?.versionNum || 0) + 1;
        const newVersion = this.versionRepository.create({
          definitionId: test.id,
          versionNum: nextNum,
          definitionJson: dto.test_case,
          checksumSha256: checksum,
          isPublished: false,
        });
        const savedNew = await this.versionRepository.save(newVersion);
        test.currentVersionId = savedNew.id;
      }
    }

    await this.definitionRepository.save(test);
    return this.formatTestCase(test);
  }

  async deleteTestCase(id: string, userId: string, isSuperuser = false): Promise<void> {
    const test = await this.definitionRepository.findOne({ where: { id } });
    if (!test || test.type !== 'test') throw new NotFoundException(`Test Case '${id}' not found`);

    await this.projectsService.verifyProjectAccess(test.projectId, userId, isSuperuser);
    await this.definitionRepository.remove(test);
  }

  async publishTestCase(id: string, userId: string, isSuperuser = false): Promise<any> {
    const test = await this.definitionRepository.findOne({ where: { id } });
    if (!test || test.type !== 'test') throw new NotFoundException(`Test Case '${id}' not found`);

    await this.projectsService.verifyProjectAccess(test.projectId, userId, isSuperuser);

    let activeVersion: DefinitionVersionEntity | null = null;
    if (test.currentVersionId) {
      activeVersion = await this.versionRepository.findOne({ where: { id: test.currentVersionId } });
    }
    if (!activeVersion) throw new BadRequestException('Test has no valid definition to publish');

    activeVersion.isPublished = true;
    activeVersion.publishedBy = userId;
    activeVersion.publishedAt = new Date();
    await this.versionRepository.save(activeVersion);

    test.status = 'published';
    await this.definitionRepository.save(test);

    return {
      status: 'published',
      test_id: test.id,
      version_id: activeVersion.id,
      version_num: activeVersion.versionNum,
      checksum: activeVersion.checksumSha256,
      published_at: activeVersion.publishedAt,
    };
  }

  async executeTestCase(
    id: string,
    dto: ExecuteTestCaseDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const test = await this.definitionRepository.findOne({ where: { id } });
    if (!test || test.type !== 'test') throw new NotFoundException(`Test Case '${id}' not found`);

    await this.projectsService.verifyProjectAccess(test.projectId, userId, isSuperuser);

    let targetVersion: DefinitionVersionEntity | null = null;
    if (test.currentVersionId) {
      targetVersion = await this.versionRepository.findOne({ where: { id: test.currentVersionId } });
    }
    if (!targetVersion) throw new BadRequestException('Test case has no definition');

    // Convert test case definition to DAG graph
    const graphDef = testCaseToGraphDefinition(targetVersion.definitionJson);

    // Domain allowlist from environment if specified
    let allowedDomains = ['*'];
    if (dto.environment_id) {
      const env = await this.environmentRepository.findOne({ where: { id: dto.environment_id } });
      if (env?.allowedDomains?.length) {
        allowedDomains = env.allowedDomains;
      }
    }

    const execution = this.executionRepository.create({
      projectId: test.projectId,
      definitionId: test.id,
      definitionVersionId: targetVersion.id,
      environmentId: dto.environment_id,
      triggerType: 'manual',
      triggeredBy: userId,
      status: 'queued',
      summary: {
        test_case_name: test.name,
        test_data_row: dto.test_data_row || {},
      },
    });

    const savedExecution = await this.executionRepository.save(execution);

    await this.queueService.addExecutionJob({
      execution_id: savedExecution.id,
      project_id: test.projectId,
      environment_id: dto.environment_id,
      user_id: userId,
      test_case_id: test.id,
      browser_config: {
        browser_type: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 800 },
        record_video: false,
        record_trace: true,
        timeout_ms: 30000,
      },
      allowed_domains: allowedDomains,
      variables: dto.test_data_row || {},
      graph_definition: graphDef as any,
      correlation_id: `test-exec-${savedExecution.id}`,
    });

    return {
      execution_id: savedExecution.id,
      id: savedExecution.id,
      status: 'queued',
      test_case_id: test.id,
      name: test.name,
      created_at: savedExecution.createdAt,
    };
  }

  async seedLegacyTests(projectId: string, userId: string, isSuperuser = false): Promise<any[]> {
    const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project not found');

    const canonicalTests = [
      {
        name: 'Smoke Test: Homepage Title & Navigation',
        description: 'Navigates to application home page and verifies document title.',
        steps: [
          { action: 'navigate', target: { url: 'https://example.com' } },
          { assertion: 'title_equals', expected: 'Example Domain' },
          { assertion: 'element_visible', target: { selector: 'h1' } },
        ],
      },
      {
        name: 'Form Submission & Validation Flow',
        description: 'Tests form inputs and button clicks with assertion check.',
        steps: [
          { action: 'navigate', target: { url: 'https://example.com' } },
          { action: 'click', target: { selector: 'a' } },
        ],
      },
    ];

    const results = [];
    for (const item of canonicalTests) {
      const created = await this.createTestCase(
        {
          project_id: project.id,
          name: item.name,
          description: item.description,
          test_case: {
            name: item.name,
            setup_steps: [],
            steps: item.steps,
            teardown_steps: [],
          },
        },
        userId,
        isSuperuser,
      );
      results.push(created);
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Test Datasets CRUD
  // ---------------------------------------------------------------------------

  async listDatasets(projectId: string | undefined, userId: string, isSuperuser = false): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const datasets = await this.datasetRepository.find({
        where: { projectId: project.id },
        order: { updatedAt: 'DESC' },
      });
      return datasets.map((d) => this.formatDataset(d));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];
    const projectIds = projects.map((p) => p.id);

    const datasets = await this.datasetRepository
      .createQueryBuilder('ds')
      .where('ds.projectId IN (:...projectIds)', { projectIds })
      .orderBy('ds.updatedAt', 'DESC')
      .getMany();

    return datasets.map((d) => this.formatDataset(d));
  }

  async getDataset(id: string, userId: string, isSuperuser = false): Promise<any> {
    const ds = await this.datasetRepository.findOne({ where: { id } });
    if (!ds) throw new NotFoundException(`Dataset '${id}' not found`);

    await this.projectsService.verifyProjectAccess(ds.projectId, userId, isSuperuser);
    return this.formatDataset(ds);
  }

  async createDataset(dto: CreateDatasetDto, userId: string, isSuperuser = false): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project workspace not found');

    const ds = this.datasetRepository.create({
      projectId: project.id,
      name: dto.name,
      description: dto.description,
      format: dto.format || 'json',
      headers: dto.headers || [],
      rows: dto.rows || [],
      createdBy: userId,
    });

    const saved = await this.datasetRepository.save(ds);
    return this.formatDataset(saved);
  }

  async updateDataset(
    id: string,
    dto: UpdateDatasetDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const ds = await this.datasetRepository.findOne({ where: { id } });
    if (!ds) throw new NotFoundException(`Dataset '${id}' not found`);

    await this.projectsService.verifyProjectAccess(ds.projectId, userId, isSuperuser);

    if (dto.name !== undefined) ds.name = dto.name;
    if (dto.description !== undefined) ds.description = dto.description;
    if (dto.format !== undefined) ds.format = dto.format;
    if (dto.headers !== undefined) ds.headers = dto.headers;
    if (dto.rows !== undefined) ds.rows = dto.rows;

    const saved = await this.datasetRepository.save(ds);
    return this.formatDataset(saved);
  }

  async deleteDataset(id: string, userId: string, isSuperuser = false): Promise<void> {
    const ds = await this.datasetRepository.findOne({ where: { id } });
    if (!ds) throw new NotFoundException(`Dataset '${id}' not found`);

    await this.projectsService.verifyProjectAccess(ds.projectId, userId, isSuperuser);
    await this.datasetRepository.remove(ds);
  }

  private async formatTestCase(test: AutomationDefinitionEntity): Promise<Record<string, any>> {
    let activeVersion: DefinitionVersionEntity | null = null;
    if (test.currentVersionId) {
      activeVersion = await this.versionRepository.findOne({ where: { id: test.currentVersionId } });
    }

    return {
      id: test.id,
      project_id: test.projectId,
      name: test.name,
      description: test.description,
      type: test.type,
      status: test.status,
      current_version_id: test.currentVersionId,
      test_case: activeVersion?.definitionJson || null,
      version_num: activeVersion?.versionNum || 1,
      is_published: activeVersion?.isPublished || false,
      checksum: activeVersion?.checksumSha256 || null,
      created_at: test.createdAt?.toISOString?.() || test.createdAt,
      updated_at: test.updatedAt?.toISOString?.() || test.updatedAt,
    };
  }

  private formatDataset(d: TestDatasetEntity): Record<string, any> {
    return {
      id: d.id,
      project_id: d.projectId,
      name: d.name,
      description: d.description,
      format: d.format,
      headers: d.headers || [],
      rows: d.rows || [],
      created_by: d.createdBy,
      created_at: d.createdAt?.toISOString?.() || d.createdAt,
      updated_at: d.updatedAt?.toISOString?.() || d.updatedAt,
    };
  }
}
