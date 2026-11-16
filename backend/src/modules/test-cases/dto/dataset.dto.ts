import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDatasetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({ example: 'Customer Test Dataset' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: 'json' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiProperty({ example: ['email', 'password'] })
  @IsArray()
  headers: string[];

  @ApiProperty({ example: [{ email: 'test@example.com', password: '123' }] })
  @IsArray()
  rows: Record<string, any>[];
}

export class UpdateDatasetDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  headers?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  rows?: Record<string, any>[];
}
