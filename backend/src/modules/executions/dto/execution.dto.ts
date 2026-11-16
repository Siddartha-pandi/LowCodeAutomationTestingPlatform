import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListExecutionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project UUID or slug' })
  @IsString()
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional({ description: 'Filter by automation definition UUID' })
  @IsUUID()
  @IsOptional()
  definition_id?: string;

  @ApiPropertyOptional({ enum: ['queued', 'running', 'passed', 'failed', 'cancelled', 'blocked'] })
  @IsIn(['queued', 'running', 'passed', 'failed', 'cancelled', 'blocked'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export class ListLogsQueryDto {
  @ApiPropertyOptional({ enum: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] })
  @IsIn(['DEBUG', 'INFO', 'WARNING', 'ERROR'])
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({ description: 'Keyword search in log messages' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by step UUID' })
  @IsUUID()
  @IsOptional()
  step_id?: string;

  @ApiPropertyOptional({ default: 200, minimum: 1, maximum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 200;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export class DownloadLogsQueryDto {
  @ApiPropertyOptional({ enum: ['txt', 'json'], default: 'txt' })
  @IsIn(['txt', 'json'])
  @IsOptional()
  format?: 'txt' | 'json' = 'txt';

  @ApiPropertyOptional({ enum: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] })
  @IsIn(['DEBUG', 'INFO', 'WARNING', 'ERROR'])
  @IsOptional()
  level?: string;
}
