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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto, UpdateEnvironmentDto } from './dto/environment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Environments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List environments for accessible projects' })
  async listEnvironments(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.environmentsService.listEnvironments(projectId, userId, isSuperuser);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an environment configuration' })
  async createEnvironment(
    @Body() dto: CreateEnvironmentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.environmentsService.createEnvironment(dto, userId, isSuperuser);
  }

  @Get(':environment_id')
  @ApiOperation({ summary: 'Get environment details' })
  async getEnvironment(
    @Param('environment_id') envId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.environmentsService.getEnvironment(envId, userId, isSuperuser);
  }

  @Put(':environment_id')
  @ApiOperation({ summary: 'Update an environment configuration' })
  async updateEnvironment(
    @Param('environment_id') envId: string,
    @Body() dto: UpdateEnvironmentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.environmentsService.updateEnvironment(envId, dto, userId, isSuperuser);
  }

  @Delete(':environment_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an environment' })
  async deleteEnvironment(
    @Param('environment_id') envId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    await this.environmentsService.deleteEnvironment(envId, userId, isSuperuser);
  }
}
