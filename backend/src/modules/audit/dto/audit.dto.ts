import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number = 0;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resource_type?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  end_date?: string;
}

export class ExportAuditLogsQueryDto {
  @ApiPropertyOptional({ enum: ['csv', 'json'], default: 'csv' })
  @IsIn(['csv', 'json'])
  @IsOptional()
  format?: 'csv' | 'json' = 'csv';

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resource_type?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({ default: 2000, minimum: 1, maximum: 10000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  limit?: number = 2000;
}

export class PurgeRetentionDto {
  @ApiPropertyOptional({ default: 90, minimum: 1, maximum: 3650 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  log_days?: number = 90;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  screenshot_days?: number = 30;

  @ApiPropertyOptional({ default: 14, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  dom_days?: number = 14;
}
