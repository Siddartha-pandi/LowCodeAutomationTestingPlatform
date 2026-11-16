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
