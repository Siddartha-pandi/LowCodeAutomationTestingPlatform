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
  async listHealingEvents(@Query() query: ListHealingEventsDto) {
    return this.healingService.listHealingEvents(query);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'List human intervention approvals' })
  async listApprovals(@Query() query: ListApprovalsDto) {
    return this.healingService.listApprovals(query);
  }

  @Post('approvals/:id/respond')
  @ApiOperation({ summary: 'Respond to pending self-healing approval' })
  async respondToApproval(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() user: any,
  ) {
    return this.healingService.respondToApproval(id, dto.decision, user.id);
  }
}
