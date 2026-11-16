import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnvironmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({ example: 'Staging' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://staging.example.com' })
  @IsString()
  @IsNotEmpty()
  base_url: string;

  @ApiProperty({ example: ['staging.example.com'], required: false })
  @IsArray()
  @IsOptional()
  allowed_domains?: string[];

  @ApiProperty({ example: { API_KEY: 'secret' }, required: false })
  @IsOptional()
  variables?: Record<string, string>;
}

export class UpdateEnvironmentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  base_url?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  allowed_domains?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  variables?: Record<string, string>;
}
