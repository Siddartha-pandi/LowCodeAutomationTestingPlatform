import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InteractiveSessionService } from './interactive-session.service';
import {
  RecordActionDto,
  SaveRecordingDto,
  StartRecorderDto,
} from './dto/browser.dto';

@ApiTags('Browser Recorder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/recorder')
export class RecorderController {
  constructor(private readonly sessionService: InteractiveSessionService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start browser recorder session' })
  async startRecorder(
    @Body() dto: StartRecorderDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.startRecorder(dto, user.userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get recorder session status' })
  async getStatus(
    @Query('session_id') sessionId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.sessionService.getRecorderStatus(sessionId, user?.userId);
  }

  @Post('action')
  @ApiOperation({ summary: 'Record and execute action' })
  async recordAction(
    @Body() dto: RecordActionDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.recordAction(dto, user.userId, user.isSuperuser);
  }

  @Get('inspect/:sessionId')
  @ApiOperation({ summary: 'Inspect page elements for recording' })
  async inspectElement(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.inspectElement(sessionId, user.userId, user.isSuperuser);
  }

  @Post('save')
  @ApiOperation({ summary: 'Save recorded actions as test case or flow' })
  async saveRecording(
    @Body() dto: SaveRecordingDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.saveRecording(dto, user.userId, user.isSuperuser);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop recording session' })
  async stopRecorder(
    @Body('session_id') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.stopRecorder(sessionId, user.userId, user.isSuperuser);
  }
}
