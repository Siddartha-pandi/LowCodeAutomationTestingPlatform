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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TestCasesService } from './test-cases.service';
import {
  CreateTestCaseDto,
  ExecuteTestCaseDto,
  SeedLegacyTestsDto as SeedLegacyDto,
  UpdateTestCaseDto,
} from './dto/test-case.dto';
import { CreateDatasetDto, UpdateDatasetDto } from './dto/dataset.dto';

@ApiTags('Testing Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/tests')
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create test case draft' })
  async createTestCase(
    @Body() dto: CreateTestCaseDto,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.createTestCase(dto, user.id, user.isSuperuser);
  }

  @Get()
  @ApiOperation({ summary: 'List test cases' })
  async listTestCases(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.listTestCases(projectId, user.id, user.isSuperuser);
  }

  // --- Datasets (must precede :id to prevent route shadowing) ---

  @Post('datasets')
  @ApiOperation({ summary: 'Create parameterized test dataset' })
  async createDataset(
    @Body() dto: CreateDatasetDto,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.createDataset(dto, user.id, user.isSuperuser);
  }

  @Get('datasets')
  @ApiOperation({ summary: 'List test datasets' })
  async listDatasets(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.listDatasets(projectId, user.id, user.isSuperuser);
  }

  @Get('datasets/:id')
  @ApiOperation({ summary: 'Get test dataset by id' })
  async getDataset(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testCasesService.getDataset(id, user.id, user.isSuperuser);
  }

  @Put('datasets/:id')
  @ApiOperation({ summary: 'Update test dataset' })
  async updateDataset(
    @Param('id') id: string,
    @Body() dto: UpdateDatasetDto,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.updateDataset(id, dto, user.id, user.isSuperuser);
  }

  @Delete('datasets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test dataset' })
  async deleteDataset(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testCasesService.deleteDataset(id, user.id, user.isSuperuser);
  }

  // --- Seed Legacy ---

  @Post('seed-legacy')
  @ApiOperation({ summary: 'Seed legacy test cases into project' })
  async seedLegacy(
    @Body() dto: SeedLegacyDto,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.seedLegacyTests(dto.project_id, user.id, user.isSuperuser);
  }

  // --- Test Case detail & lifecycle ---

  @Get(':id')
  @ApiOperation({ summary: 'Get test case details' })
  async getTestCase(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testCasesService.getTestCase(id, user.id, user.isSuperuser);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update test case' })
  async updateTestCase(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.updateTestCase(id, dto, user.id, user.isSuperuser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test case' })
  async deleteTestCase(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testCasesService.deleteTestCase(id, user.id, user.isSuperuser);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish test case version' })
  async publishTestCase(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testCasesService.publishTestCase(id, user.id, user.isSuperuser);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute test case' })
  async executeTestCase(
    @Param('id') id: string,
    @Body() dto: ExecuteTestCaseDto,
    @CurrentUser() user: any,
  ) {
    return this.testCasesService.executeTestCase(id, dto, user.id, user.isSuperuser);
  }
}
