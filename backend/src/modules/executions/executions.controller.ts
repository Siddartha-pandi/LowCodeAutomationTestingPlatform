import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { ExecutionsService } from './executions.service';
import {
  DownloadLogsQueryDto,
  ListExecutionsQueryDto,
  ListLogsQueryDto,
} from './dto/execution.dto';

@ApiTags('Executions & Reports')
@Controller()
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  // ---------------------------------------------------------------------------
  // Public Health Endpoints
  // ---------------------------------------------------------------------------

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Public health status' })
  async rootHealth() {
    return this.executionsService.getHealthStatus();
  }

  @Public()
  @Get('internal/v1/health')
  @ApiOperation({ summary: 'Internal health status' })
  async internalHealth() {
    return this.executionsService.getHealthStatus();
  }

  // ---------------------------------------------------------------------------
  // Internal API compatibility
  // ---------------------------------------------------------------------------

  @Post('internal/v1/jobs/execute')
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Internal job submission' })
  async submitExecutionJob(@Body() payload: unknown) {
    return this.executionsService.submitExecution(payload);
  }

  @Post('internal/v1/jobs/:execution_id/cancel')
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Internal job cancellation' })
  async cancelExecutionJob(@Param('execution_id') executionId: string) {
    return this.executionsService.cancelExecution(executionId, 'internal', true);
  }

  // ---------------------------------------------------------------------------
  // Standard API v1 Executions Endpoints
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/executions')
  @ApiOperation({ summary: 'List execution runs with status filters' })
  async listExecutions(
    @Query() query: ListExecutionsQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.executionsService.listExecutions(query, user.userId, user.isSuperuser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/executions/:id')
  @ApiOperation({ summary: 'Get execution details with step metrics' })
  async getExecution(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionsService.getExecution(id, user.userId, user.isSuperuser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('api/v1/executions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete execution run' })
  async deleteExecution(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionsService.deleteExecution(id, user.userId, user.isSuperuser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('api/v1/executions/:id/cancel')
  @ApiOperation({ summary: 'Cancel queued or active execution' })
  async cancelExecution(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionsService.cancelExecution(id, user.userId, user.isSuperuser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/executions/:id/artifacts')
  @ApiOperation({ summary: 'List artifacts for an execution' })
  async listArtifacts(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionsService.listArtifacts(id, user.userId, user.isSuperuser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/executions/:id/logs')
  @ApiOperation({ summary: 'Get execution diagnostic logs with filters' })
  async getExecutionLogs(
    @Param('id') id: string,
    @Query() query: ListLogsQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.executionsService.getExecutionLogs(id, query, user.userId, user.isSuperuser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/executions/:id/logs/download')
  @ApiOperation({ summary: 'Download execution diagnostic logs' })
  async downloadExecutionLogs(
    @Param('id') id: string,
    @Query() query: DownloadLogsQueryDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const file = await this.executionsService.downloadExecutionLogs(
      id,
      query,
      user.userId,
      user.isSuperuser,
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/executions/:id/viewport')
  @ApiOperation({ summary: 'Get live or latest viewport screenshot' })
  async getExecutionViewport(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const filePath = await this.executionsService.getExecutionViewportPath(
      id,
      user.userId,
      user.isSuperuser,
    );
    res.sendFile(filePath);
  }
}
