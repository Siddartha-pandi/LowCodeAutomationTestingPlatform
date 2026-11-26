import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InteractiveSessionService } from './interactive-session.service';
import { DomExploreDto } from './dto/browser.dto';

@ApiTags('DOM Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/dom')
export class DomController {
  constructor(private readonly sessionService: InteractiveSessionService) {}

  @Post('extract')
  @ApiOperation({ summary: 'Extract interactive DOM elements from active session' })
  async extractDom(
    @Body('session_id') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.inspectElement(sessionId, user.id, user.isSuperuser);
  }

  @Post('explore')
  @ApiOperation({ summary: 'Explore DOM and capture elements for URL' })
  async exploreDom(
    @Body() dto: DomExploreDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.exploreDom(dto, user.id);
  }
}
