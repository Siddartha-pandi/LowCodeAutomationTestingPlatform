import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HealingService } from './healing.service';
import {
  ApprovalActionDto,
  ListApprovalsDto,
  ListHealingEventsDto,
} from './dto/healing.dto';

@ApiTags('Self Healing & Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/healing')
export class HealingController {
  constructor(private readonly healingService: HealingService) {}

  @Get('events')
  @ApiOperation({ summary: 'List self-healing events' })
  async listHealingEvents(
    @Query() query: ListHealingEventsDto,
    @CurrentUser() user: any,
  ) {
    return this.healingService.listHealingEvents(query, user.id, user.isSuperuser);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'List human intervention approvals' })
  async listApprovals(
    @Query() query: ListApprovalsDto,
    @CurrentUser() user: any,
  ) {
    return this.healingService.listApprovals(query, user.id, user.isSuperuser);
  }

  @Post('approvals/:id/respond')
  @UseGuards(RbacGuard)
  @RequirePermissions('healing:approve')
  @ApiOperation({ summary: 'Respond to pending self-healing approval' })
  async respondToApproval(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() user: any,
  ) {
    return this.healingService.respondToApproval(id, dto.decision, user.id, user.isSuperuser);
  }
}
