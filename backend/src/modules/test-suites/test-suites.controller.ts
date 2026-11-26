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
import { TestSuitesService } from './test-suites.service';
import {
  CreateTestSuiteDto,
  ExecuteTestSuiteDto,
  UpdateTestSuiteDto,
} from './dto/test-suite.dto';

@ApiTags('Test Suites & Regression')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/test-suites')
export class TestSuitesController {
  constructor(private readonly testSuitesService: TestSuitesService) {}

  @Post()
  @ApiOperation({ summary: 'Create regression test suite' })
  async createTestSuite(
    @Body() dto: CreateTestSuiteDto,
    @CurrentUser() user: any,
  ) {
    return this.testSuitesService.createTestSuite(dto, user.id, user.isSuperuser);
  }

  @Get()
  @ApiOperation({ summary: 'List regression test suites' })
  async listTestSuites(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.testSuitesService.listTestSuites(projectId, user.id, user.isSuperuser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get regression test suite by id' })
  async getTestSuite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testSuitesService.getTestSuite(id, user.id, user.isSuperuser);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update test suite' })
  async updateTestSuite(
    @Param('id') id: string,
    @Body() dto: UpdateTestSuiteDto,
    @CurrentUser() user: any,
  ) {
    return this.testSuitesService.updateTestSuite(id, dto, user.id, user.isSuperuser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test suite' })
  async deleteTestSuite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.testSuitesService.deleteTestSuite(id, user.id, user.isSuperuser);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute regression test suite' })
  async executeTestSuite(
    @Param('id') id: string,
    @Body() dto: ExecuteTestSuiteDto,
    @CurrentUser() user: any,
  ) {
    return this.testSuitesService.executeTestSuite(id, dto, user.id, user.isSuperuser);
  }
}
