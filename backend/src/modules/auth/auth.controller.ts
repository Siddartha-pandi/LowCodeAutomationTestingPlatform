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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  LegacyAuthDto,
  LegacyAuthResponseDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    response.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 3600 * 1000,
    });
    return tokenResponse;
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
    response.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 3600 * 1000,
    });
    return tokenResponse;
  }

  @Get('api/v1/auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('api/v1/auth/logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out user and clear session cookie' })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { status: 'logged_out', message: 'Session closed successfully' };
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
    response.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 3600 * 1000,
    });
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
    response.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 3600 * 1000,
    });
    return { token, user_id: 1 };
  }
}
