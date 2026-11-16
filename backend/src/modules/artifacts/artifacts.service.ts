import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name);
  private readonly storageDir: string;

  constructor(
    @InjectRepository(ArtifactEntity)
    private readonly artifactRepository: Repository<ArtifactEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    private readonly projectsService: ProjectsService,
    private readonly configService: ConfigService,
  ) {
    this.storageDir = path.resolve(
      this.configService.get<string>('app.storage.dir') || 'storage',
    );
    // Ensure base storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async getArtifactMetadata(
    id: string,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const artifact = await this.artifactRepository.findOne({ where: { id } });
    if (!artifact) throw new NotFoundException(`Artifact '${id}' not found`);

    await this.verifyAccess(artifact.executionId, userId, isSuperuser);

    return {
      id: artifact.id,
      execution_id: artifact.executionId,
      artifact_type: artifact.artifactType,
      file_path: artifact.filePath,
      file_size_bytes: artifact.fileSizeBytes,
      mime_type: artifact.mimeType,
      sha256_hash: artifact.sha256Hash,
      created_at: artifact.createdAt,
    };
  }

  async getSafeArtifactFile(
    id: string,
    userId: string,
    isSuperuser = false,
  ): Promise<{ filePath: string; filename: string; mimeType: string; sha256: string }> {
    const artifact = await this.artifactRepository.findOne({ where: { id } });
    if (!artifact) throw new NotFoundException(`Artifact '${id}' not found`);

    await this.verifyAccess(artifact.executionId, userId, isSuperuser);

    const resolved = path.resolve(artifact.filePath);
    const relative = path.relative(this.storageDir, resolved);

    // Prevent path traversal
    if (relative.startsWith('..') && !path.isAbsolute(artifact.filePath)) {
      throw new ForbiddenException(
        `Path traversal detected: Artifact is outside storage directory`,
      );
    }

    if (!fs.existsSync(resolved)) {
      throw new NotFoundException(`File missing from storage: ${path.basename(resolved)}`);
    }

    return {
      filePath: resolved,
      filename: path.basename(resolved),
      mimeType: artifact.mimeType || 'application/octet-stream',
      sha256: artifact.sha256Hash,
    };
  }

  async verifyArtifactIntegrity(
    id: string,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const artifact = await this.artifactRepository.findOne({ where: { id } });
    if (!artifact) throw new NotFoundException(`Artifact '${id}' not found`);

    await this.verifyAccess(artifact.executionId, userId, isSuperuser);

    let isIntact = false;
    try {
      const resolved = path.resolve(artifact.filePath);
      if (fs.existsSync(resolved)) {
        const fileBuffer = fs.readFileSync(resolved);
        const computed = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        isIntact = computed.toLowerCase() === artifact.sha256Hash.toLowerCase();
      }
    } catch (err: any) {
      this.logger.warn(`Integrity verification failed for ${id}: ${err.message}`);
    }

    return {
      artifact_id: artifact.id,
      sha256_indexed: artifact.sha256Hash,
      is_intact: isIntact,
      verified_at: new Date().toISOString(),
    };
  }

  async saveArtifact(
    executionId: string,
    artifactType: string,
    content: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<ArtifactEntity> {
    const execDir = path.join(this.storageDir, 'artifacts', executionId);
    fs.mkdirSync(execDir, { recursive: true });

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(execDir, safeFilename);

    fs.writeFileSync(targetPath, content);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');

    const artifact = this.artifactRepository.create({
      executionId,
      artifactType,
      filePath: targetPath,
      fileSizeBytes: content.length,
      mimeType: mimeType || 'application/octet-stream',
      sha256Hash: sha256,
    });

    return this.artifactRepository.save(artifact);
  }

  private async verifyAccess(executionId: string, userId: string, isSuperuser: boolean) {
    const execution = await this.executionRepository.findOne({ where: { id: executionId } });
    if (!execution) throw new NotFoundException(`Execution '${executionId}' not found`);

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }
  }
}
