import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@client.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@client.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsString()
  @IsOptional()
  full_name?: string;
}

export class TokenResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ default: 'bearer' })
  token_type: string;

  @ApiProperty()
  user: Record<string, any>;
}

export class LegacyAuthDto {
  @ApiProperty({ example: 'admin@client.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LegacyAuthResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty({ example: 1 })
  user_id: number;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@enterprise.local' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Secure password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecret123!' })
  @IsString()
  @MinLength(6)
  new_password: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  resetToken?: string;

  @ApiProperty({ required: false })
  resetUrl?: string;
}

