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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { AddProjectMemberDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Projects & Workspaces')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('api/v1/projects')
  @ApiOperation({ summary: 'List all project workspaces accessible to caller' })
  async listProjects(
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.projectsService.listProjects(userId, isSuperuser);
  }

  @Post('api/v1/projects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project workspace' })
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.createProject(dto, userId);
  }

  @Get('api/v1/projects/:project_id')
  @ApiOperation({ summary: 'Get project workspace details' })
  async getProject(
    @Param('project_id') projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.projectsService.getProject(projectId, userId, isSuperuser);
  }

  @Put('api/v1/projects/:project_id')
  @ApiOperation({ summary: 'Update project workspace metadata' })
  async updateProject(
    @Param('project_id') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.projectsService.updateProject(projectId, dto, userId, isSuperuser);
  }

  @Delete('api/v1/projects/:project_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project workspace' })
  async deleteProject(
    @Param('project_id') projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    await this.projectsService.deleteProject(projectId, userId, isSuperuser);
  }

  @Get('api/v1/projects/:project_id/members')
  @ApiOperation({ summary: 'List all members assigned to project workspace' })
  async listMembers(
    @Param('project_id') projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.projectsService.listMembers(projectId, userId, isSuperuser);
  }

  @Post('api/v1/projects/:project_id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to a project workspace' })
  async addMember(
    @Param('project_id') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.projectsService.addMember(projectId, dto, userId, isSuperuser);
  }

  @Delete('api/v1/projects/:project_id/members/:user_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a project workspace' })
  async removeMember(
    @Param('project_id') projectId: string,
    @Param('user_id') memberUserId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    await this.projectsService.removeMember(projectId, memberUserId, userId, isSuperuser);
  }

  // ---------------------------------------------------------------------------
  // Backward-Compatible Legacy Workspaces Endpoint
  // ---------------------------------------------------------------------------
  @Get('api/workspaces')
  @ApiOperation({ summary: 'Legacy workspace listing endpoint' })
  async listLegacyWorkspaces(
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    const projects = await this.projectsService.listProjects(userId, isSuperuser);
    return projects.map((p) => ({
      id: 1, // Legacy integer id
      uuid: p.id,
      name: p.name,
      created_at: p.created_at,
    }));
  }
}
