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
import { ProjectsService } from '../projects/projects.service';
import { QueueService } from '../../queue/queue.service';
import { computeDefinitionChecksum } from '../flows/flow-checksum';
import {
  CreateTestSuiteDto,
  ExecuteTestSuiteDto,
  UpdateTestSuiteDto,
} from './dto/test-suite.dto';

@Injectable()
export class TestSuitesService {
  private readonly logger = new Logger(TestSuitesService.name);

  constructor(
    @InjectRepository(AutomationDefinitionEntity)
    private readonly definitionRepository: Repository<AutomationDefinitionEntity>,
    @InjectRepository(DefinitionVersionEntity)
    private readonly versionRepository: Repository<DefinitionVersionEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    private readonly projectsService: ProjectsService,
    private readonly queueService: QueueService,
  ) {}

  async createTestSuite(
    dto: CreateTestSuiteDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const project = await this.projectsService.resolveProject(dto.project_id, userId, isSuperuser);
    if (!project) throw new NotFoundException('Project workspace not found');

    const suiteDef = dto.test_suite;
    const checksum = computeDefinitionChecksum(suiteDef);

    const suite = this.definitionRepository.create({
      projectId: project.id,
      name: dto.name,
      description: dto.description,
      type: 'test_suite',
      status: 'published',
      createdBy: userId,
    });
    const savedSuite = await this.definitionRepository.save(suite);

    const version = this.versionRepository.create({
      definitionId: savedSuite.id,
      versionNum: 1,
      definitionJson: suiteDef,
      checksumSha256: checksum,
      isPublished: true,
      publishedBy: userId,
      publishedAt: new Date(),
    });
    const savedVersion = await this.versionRepository.save(version);

    savedSuite.currentVersionId = savedVersion.id;
    await this.definitionRepository.save(savedSuite);

    return this.formatTestSuite(savedSuite, savedVersion);
  }

  async listTestSuites(
    projectId: string | undefined,
    userId: string,
    isSuperuser = false,
  ): Promise<any[]> {
    if (projectId) {
      const project = await this.projectsService.resolveProject(projectId, userId, isSuperuser);
      if (!project) return [];
      const suites = await this.definitionRepository.find({
        where: { projectId: project.id, type: 'test_suite' },
        order: { updatedAt: 'DESC' },
      });
      return Promise.all(suites.map((s) => this.formatTestSuite(s)));
    }

    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    if (projects.length === 0) return [];
    const projectIds = projects.map((p) => p.id);

    const suites = await this.definitionRepository
      .createQueryBuilder('s')
      .where('s.projectId IN (:...projectIds)', { projectIds })
      .andWhere('s.type = :type', { type: 'test_suite' })
      .orderBy('s.updatedAt', 'DESC')
      .getMany();

    return Promise.all(suites.map((s) => this.formatTestSuite(s)));
  }

  async getTestSuite(id: string, userId: string, isSuperuser = false): Promise<any> {
    const suite = await this.definitionRepository.findOne({ where: { id } });
    if (!suite || suite.type !== 'test_suite') {
      throw new NotFoundException(`Test Suite '${id}' not found`);
    }

    await this.projectsService.verifyProjectAccess(suite.projectId, userId, isSuperuser);
    return this.formatTestSuite(suite);
  }

  async updateTestSuite(
    id: string,
    dto: UpdateTestSuiteDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const suite = await this.definitionRepository.findOne({ where: { id } });
    if (!suite || suite.type !== 'test_suite') {
      throw new NotFoundException(`Test Suite '${id}' not found`);
    }

    await this.projectsService.verifyProjectAccess(suite.projectId, userId, isSuperuser);

    if (dto.name !== undefined) suite.name = dto.name;
    if (dto.description !== undefined) suite.description = dto.description;

    if (dto.test_suite) {
      const checksum = computeDefinitionChecksum(dto.test_suite);
      const lastVersion = await this.versionRepository.findOne({
        where: { definitionId: suite.id },
        order: { versionNum: 'DESC' },
      });
      const nextNum = (lastVersion?.versionNum || 0) + 1;
      const newVersion = this.versionRepository.create({
        definitionId: suite.id,
        versionNum: nextNum,
        definitionJson: dto.test_suite,
        checksumSha256: checksum,
        isPublished: true,
        publishedBy: userId,
        publishedAt: new Date(),
      });
      const savedNew = await this.versionRepository.save(newVersion);
      suite.currentVersionId = savedNew.id;
    }

    await this.definitionRepository.save(suite);
    return this.formatTestSuite(suite);
  }

  async deleteTestSuite(id: string, userId: string, isSuperuser = false): Promise<void> {
    const suite = await this.definitionRepository.findOne({ where: { id } });
    if (!suite || suite.type !== 'test_suite') {
      throw new NotFoundException(`Test Suite '${id}' not found`);
    }

    await this.projectsService.verifyProjectAccess(suite.projectId, userId, isSuperuser);
    await this.definitionRepository.remove(suite);
  }

  async executeTestSuite(
    id: string,
    dto: ExecuteTestSuiteDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const suite = await this.definitionRepository.findOne({ where: { id } });
    if (!suite || suite.type !== 'test_suite') {
      throw new NotFoundException(`Test Suite '${id}' not found`);
    }

    await this.projectsService.verifyProjectAccess(suite.projectId, userId, isSuperuser);

    let targetVersion: DefinitionVersionEntity | null = null;
    if (suite.currentVersionId) {
      targetVersion = await this.versionRepository.findOne({ where: { id: suite.currentVersionId } });
    }
    if (!targetVersion) {
      throw new BadRequestException('Test suite has no valid definition');
    }

    const suiteDef = targetVersion.definitionJson;
    const testCaseIds: string[] = suiteDef.test_case_ids || [];

    const suiteExecution = this.executionRepository.create({
      projectId: suite.projectId,
      definitionId: suite.id,
      definitionVersionId: targetVersion.id,
      environmentId: dto.environment_id,
      triggerType: 'manual',
      triggeredBy: userId,
      status: 'queued',
      summary: {
        suite_name: suite.name,
        test_cases_total: testCaseIds.length,
        cases_passed: 0,
        cases_failed: 0,
      },
    });

    const savedExecution = await this.executionRepository.save(suiteExecution);

    await this.queueService.addSuiteJob(savedExecution.id, {
      suite_execution_id: savedExecution.id,
      project_id: suite.projectId,
      environment_id: dto.environment_id,
      user_id: userId,
      test_case_ids: testCaseIds,
      stop_on_failure: suiteDef.stop_on_failure ?? false,
      variables: dto.test_data_row || {},
    });

    return {
      execution_id: savedExecution.id,
      id: savedExecution.id,
      status: 'queued',
      suite_id: suite.id,
      name: suite.name,
      test_cases_count: testCaseIds.length,
      created_at: savedExecution.createdAt,
    };
  }

  private async formatTestSuite(
    suite: AutomationDefinitionEntity,
    explicitVersion?: DefinitionVersionEntity,
  ) {
    let version = explicitVersion;
    if (!version && suite.currentVersionId) {
      version = await this.versionRepository.findOne({ where: { id: suite.currentVersionId } });
    }
    if (!version) {
      version = await this.versionRepository.findOne({
        where: { definitionId: suite.id },
        order: { versionNum: 'DESC' },
      });
    }

    return {
      id: suite.id,
      project_id: suite.projectId,
      name: suite.name,
      description: suite.description,
      status: suite.status,
      created_at: suite.createdAt,
      updated_at: suite.updatedAt,
      definition: version?.definitionJson || null,
    };
  }
}
