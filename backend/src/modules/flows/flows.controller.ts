import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FlowsService } from './flows.service';
import { CreateFlowDto, ExecuteFlowDto, UpdateFlowDto, ValidateFlowDto } from './dto/flow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Visual Automation Flows')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  @ApiOperation({ summary: 'List all visual automation flows for a project' })
  async listFlows(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.flowsService.listFlows(projectId, userId, isSuperuser);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List predefined flow templates' })
  async listTemplates() {
    return this.flowsService.getTemplates();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate DAG graph structure, nodes, and connections' })
  async validateFlow(@Body() dto: ValidateFlowDto) {
    return this.flowsService.validateGraphDefinition(dto.definition);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new visual automation flow' })
  async createFlow(
    @Body() dto: CreateFlowDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.flowsService.createFlow(dto, userId, isSuperuser);
  }

  @Get(':flow_id')
  @ApiOperation({ summary: 'Get visual automation flow details and active graph' })
  async getFlow(
    @Param('flow_id') flowId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.flowsService.getFlow(flowId, userId, isSuperuser);
  }

  @Put(':flow_id')
  @ApiOperation({ summary: 'Update flow metadata or draft graph definition' })
  async updateFlow(
    @Param('flow_id') flowId: string,
    @Body() dto: UpdateFlowDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.flowsService.updateFlow(flowId, dto, userId, isSuperuser);
  }

  @Delete(':flow_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a visual automation flow' })
  async deleteFlow(
    @Param('flow_id') flowId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    await this.flowsService.deleteFlow(flowId, userId, isSuperuser);
  }

  @Post(':flow_id/publish')
  @ApiOperation({ summary: 'Publish current flow definition into an immutable version' })
  async publishFlow(
    @Param('flow_id') flowId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.flowsService.publishFlow(flowId, userId, isSuperuser);
  }

  @Post(':flow_id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger flow execution in isolated browser worker' })
  async executeFlow(
    @Param('flow_id') flowId: string,
    @Body() dto: ExecuteFlowDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.flowsService.executeFlow(flowId, dto, userId, isSuperuser);
  }
}
