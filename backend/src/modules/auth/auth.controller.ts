import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  LegacyAuthDto,
  LegacyAuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MessageResponseDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(maxAge?: number) {
    const sameSite = this.configService.get<'lax' | 'strict' | 'none'>('app.cookie.sameSite') || 'lax';
    const configuredSecure = this.configService.get<boolean>('app.cookie.secure');
    const secure =
      sameSite === 'none'
        ? true
        : configuredSecure !== undefined
          ? configuredSecure
          : process.env.NODE_ENV === 'production';
    const domain = this.configService.get<string>('app.cookie.domain');

    return {
      sameSite,
      secure,
      path: '/',
      ...(domain ? { domain } : {}),
      ...(maxAge !== undefined ? { maxAge } : {}),
    };
  }

  private setAuthCookies(response: Response, token: string): string {
    const expiryMinutes = this.configService.get<number>('app.tokenExpiryMinutes') || 480;
    const maxAge = expiryMinutes * 60 * 1000;
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const cookieOpts = this.getCookieOptions(maxAge);

    response.cookie('access_token', token, {
      httpOnly: true,
      ...cookieOpts,
    });
    response.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      ...cookieOpts,
    });
    return csrfToken;
  }

  @Public()
  @Post('api/v1/auth/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new enterprise user account' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenResponseDto> {
    const { tokenResponse, token } = await this.authService.register(dto);
    const csrfToken = this.setAuthCookies(response, token);
    return { ...tokenResponse, csrf_token: csrfToken } as any;
  }

  @Public()
  @Post('api/v1/auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenResponseDto> {
    const { tokenResponse, token } = await this.authService.login(dto);
    const csrfToken = this.setAuthCookies(response, token);
    return { ...tokenResponse, csrf_token: csrfToken } as any;
  }

  @Get('api/v1/auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  async me(
    @CurrentUser('id') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const profile = await this.authService.getProfile(userId);
    let csrfToken = request.cookies?.['csrf_token'];
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(32).toString('hex');
      const expiryMinutes = this.configService.get<number>('app.tokenExpiryMinutes') || 480;
      response.cookie('csrf_token', csrfToken, {
        httpOnly: false,
        ...this.getCookieOptions(expiryMinutes * 60 * 1000),
      });
    }
    return { ...profile, csrf_token: csrfToken };
  }

  @Post('api/v1/auth/logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out user and clear session cookie' })
  async logout(@Res({ passthrough: true }) response: Response) {
    const clearOpts = this.getCookieOptions();
    response.clearCookie('access_token', clearOpts);
    response.clearCookie('csrf_token', clearOpts);
    return { status: 'logged_out', message: 'Session closed successfully' };
  }

  @Public()
  @Post('api/v1/auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset instructions for an enterprise account' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('api/v1/auth/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password using a valid reset token' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  // ---------------------------------------------------------------------------
  // Backward-Compatible Legacy Endpoints
  // ---------------------------------------------------------------------------

  @Public()
  @Post('api/auth/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Legacy registration endpoint' })
  async legacyRegister(
    @Body() dto: LegacyAuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LegacyAuthResponseDto> {
    const { token } = await this.authService.register({
      email: dto.email,
      password: dto.password,
    });
    this.setAuthCookies(response, token);
    return { token, user_id: 1 };
  }

  @Public()
  @Post('api/auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Legacy login endpoint' })
  async legacyLogin(
    @Body() dto: LegacyAuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LegacyAuthResponseDto> {
    const { token } = await this.authService.login({
      email: dto.email,
      password: dto.password,
    });
    this.setAuthCookies(response, token);
    return { token, user_id: 1 };
  }
}
