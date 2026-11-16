import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ArtifactsService } from './artifacts.service';

@ApiTags('Artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get artifact metadata and checksum' })
  async getMetadata(@Param('id') id: string, @CurrentUser() user: any) {
    return this.artifactsService.getArtifactMetadata(id, user.userId, user.isSuperuser);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download binary artifact file' })
  async downloadArtifact(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const file = await this.artifactsService.getSafeArtifactFile(
      id,
      user.userId,
      user.isSuperuser,
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('X-SHA256-Checksum', file.sha256);
    res.sendFile(file.filePath);
  }

  @Get(':id/view')
  @ApiOperation({ summary: 'View binary artifact inline in browser' })
  async viewArtifact(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const file = await this.artifactsService.getSafeArtifactFile(
      id,
      user.userId,
      user.isSuperuser,
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-SHA256-Checksum', file.sha256);
    res.sendFile(file.filePath);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify artifact cryptographic SHA-256 integrity' })
  async verifyArtifact(@Param('id') id: string, @CurrentUser() user: any) {
    return this.artifactsService.verifyArtifactIntegrity(id, user.userId, user.isSuperuser);
  }
}
