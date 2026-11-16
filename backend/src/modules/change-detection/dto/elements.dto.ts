import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateElementProfileDto {
  @ApiProperty({ description: 'Target project UUID' })
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({ description: 'Logical element identifier, e.g. login_button' })
  @IsString()
  @IsNotEmpty()
  logical_id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: 'button' })
  @IsString()
  @IsOptional()
  element_type?: string = 'button';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  page_context?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  original_text?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  stable_attributes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  structural_fingerprint?: Record<string, any>;
}

export class UpdateElementProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  element_type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  page_context?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  original_text?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  stable_attributes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  structural_fingerprint?: Record<string, any>;
}

export class AddLocatorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  locator_type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  locator_value: string;
}
