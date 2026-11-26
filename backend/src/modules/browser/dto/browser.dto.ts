import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LaunchSessionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  session_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  allowed_domains?: string[];
}

export class NavigateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty({ description: 'Target destination URL' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  url: string;

  @ApiPropertyOptional({ default: 30 })
  @IsNumber()
  @IsOptional()
  timeout?: number = 30;
}

export class ActionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty({ description: 'Action type: click, dblclick, fill, type, select, check, uncheck, scroll' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ default: '' })
  @IsString()
  @IsOptional()
  selector?: string = '';

  @ApiPropertyOptional({ default: '' })
  @IsString()
  @IsOptional()
  text?: string = '';

  @ApiPropertyOptional({ default: '' })
  @IsString()
  @IsOptional()
  value?: string = '';

  @ApiPropertyOptional({ default: 15 })
  @IsNumber()
  @IsOptional()
  timeout?: number = 15;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  y?: number;
}

export class ScreenshotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  custom_name?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  full_page?: boolean = false;
}

export class CloseSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;
}

export class ValidateSelectorDto {
  @ApiProperty({ description: 'Primary selector string to validate' })
  @IsString()
  @IsNotEmpty()
  selector: string;
}

export class TestSelectorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  selector: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  fallbacks?: string[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  highlight?: boolean = true;

  @ApiPropertyOptional({ default: 10 })
  @IsNumber()
  @IsOptional()
  timeout?: number = 10;
}

export class StartRecorderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  target_url: string;
}

export class RecordActionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ default: '' })
  @IsString()
  @IsOptional()
  selector?: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  y?: number;
}

export class SaveRecordingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ default: 'test' })
  @IsString()
  @IsOptional()
  target_type?: 'test' | 'flow' = 'test';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class DomExploreDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  session_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  full_page?: boolean;
}
