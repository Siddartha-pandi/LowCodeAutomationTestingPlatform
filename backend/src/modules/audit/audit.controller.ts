import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';
import {
  ExportAuditLogsQueryDto,
  ListAuditLogsQueryDto,
  PurgeRetentionDto,
} from './dto/audit.dto';

@ApiTags('Audit & Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@RequirePermissions('users:manage')
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit trail logs' })
  async listLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.auditService.listAuditLogs(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs in CSV or JSON format' })
  async exportLogs(
    @Query() query: ExportAuditLogsQueryDto,
    @Res() res: Response,
  ) {
    const file = await this.auditService.exportAuditLogs(query);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }

  @Post('retention/purge')
  @ApiOperation({ summary: 'Trigger retention purge of expired logs and artifacts' })
  async purgeRetention(
    @Body() dto: PurgeRetentionDto,
    @CurrentUser() user: any,
  ) {
    return this.auditService.purgeRetention(dto, user.id);
  }
}
