import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports & Analytics')
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/reports/summary')
  @ApiOperation({ summary: 'Get aggregated execution metrics and trends' })
  async getSummary(@Query('project_id') projectId?: string) {
    return this.reportsService.getSummary(projectId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/reports/export-csv')
  @ApiOperation({ summary: 'Export executions dataset to CSV' })
  async exportCsv(@Query('project_id') projectId: string, @Res() res: Response) {
    const file = await this.reportsService.exportCsv(projectId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }
}
