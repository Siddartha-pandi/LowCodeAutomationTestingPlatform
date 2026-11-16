import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ description: 'Automation definition UUID' })
  @IsUUID()
  @IsNotEmpty()
  definition_id: string;

  @ApiProperty({ description: 'Environment UUID' })
  @IsUUID()
  @IsNotEmpty()
  environment_id: string;

  @ApiProperty({ description: 'Cron expression (e.g., */15 * * * *)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(64)
  cron_expression: string;

  @ApiPropertyOptional({ default: 'UTC' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  timezone?: string = 'UTC';

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean = true;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(64)
  cron_expression?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean;
}
