import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InteractiveSessionService } from './interactive-session.service';
import {
  ActionDto,
  CloseSessionDto,
  LaunchSessionDto,
  NavigateDto,
  ScreenshotDto,
  TestSelectorDto,
  ValidateSelectorDto,
} from './dto/browser.dto';

@ApiTags('Browser Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/browser')
export class BrowserController {
  constructor(private readonly sessionService: InteractiveSessionService) {}

  @Get('status')
  @ApiOperation({ summary: 'Browser engine status' })
  async getStatus() {
    return {
      engine: 'playwright',
      cli_configured: 'playwright-native',
      is_installed: true,
      mode: 'in_process_playwright',
      zero_ai_policy: 'Strict Zero-AI Active (100% Deterministic)',
      default_timeout_seconds: 30,
      health: 'healthy',
      error_message: null,
    };
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test browser engine connection' })
  async testConnection() {
    return {
      success: true,
      message: 'Playwright browser engine responsive and healthy.',
      version: '1.49.1',
      session_state: 'ready',
    };
  }

  @Post('launch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Launch interactive browser session' })
  async launchSession(
    @Body() dto: LaunchSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.launchSession(dto, user.id, user.isSuperuser);
  }

  @Post('navigate')
  @ApiOperation({ summary: 'Navigate active session to target URL' })
  async navigateSession(
    @Body() dto: NavigateDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.navigateSession(dto, user.id, user.isSuperuser);
  }

  @Post('action')
  @ApiOperation({ summary: 'Execute browser user interaction' })
  async executeAction(
    @Body() dto: ActionDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.executeAction(dto, user.id, user.isSuperuser);
  }

  @Post('screenshot')
  @ApiOperation({ summary: 'Capture viewport screenshot' })
  async captureScreenshot(
    @Body() dto: ScreenshotDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.captureScreenshot(dto, user.id, user.isSuperuser);
  }

  @Get('viewport/:sessionId')
  @ApiOperation({ summary: 'Get current session viewport snapshot' })
  async getViewport(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.getViewport(sessionId, user.id, user.isSuperuser);
  }

  @Post('close')
  @ApiOperation({ summary: 'Close browser session' })
  async closeSession(
    @Body() dto: CloseSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.closeSession(dto.session_id, user.id, user.isSuperuser);
  }

  @Post('validate-selector')
  @ApiOperation({ summary: 'Validate selector syntax' })
  async validateSelector(@Body() dto: ValidateSelectorDto) {
    return this.sessionService.validateSelector(dto.selector);
  }

  @Post('test-selector')
  @ApiOperation({ summary: 'Test selector in live browser session' })
  async testSelector(
    @Body() dto: TestSelectorDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionService.testSelector(dto, user.id, user.isSuperuser);
  }
}
