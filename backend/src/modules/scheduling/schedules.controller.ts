import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';

@ApiTags('Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create cron automation schedule' })
  async createSchedule(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.createSchedule(dto, user.id, user.isSuperuser);
  }

  @Get()
  @ApiOperation({ summary: 'List automation schedules' })
  async listSchedules(
    @Query('definition_id') definitionId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.listSchedules(definitionId, user.id, user.isSuperuser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by id' })
  async getSchedule(@Param('id') id: string, @CurrentUser() user: any) {
    return this.schedulesService.getSchedule(id, user.id, user.isSuperuser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update schedule properties' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.updateSchedule(id, dto, user.id, user.isSuperuser);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule properties (PUT alias)' })
  async updateSchedulePut(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.schedulesService.updateSchedule(id, dto, user.id, user.isSuperuser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete automation schedule' })
  async deleteSchedule(@Param('id') id: string, @CurrentUser() user: any) {
    return this.schedulesService.deleteSchedule(id, user.id, user.isSuperuser);
  }

  @Post('evaluate')
  @UseGuards(RbacGuard)
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'Manually trigger immediate schedule evaluation' })
  async evaluateNow() {
    return this.schedulesService.evaluateSchedulesNow();
  }
}
