import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListHealingEventsDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  execution_id?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  element_profile_id?: string;

  @ApiPropertyOptional({ enum: ['auto_healed', 'requires_approval', 'rejected'] })
  @IsIn(['auto_healed', 'requires_approval', 'rejected'])
  @IsOptional()
  decision?: string;

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

export class ListApprovalsDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'] })
  @IsIn(['pending', 'approved', 'rejected'])
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

export class ApprovalActionDto {
  @ApiPropertyOptional({ enum: ['approved', 'rejected'], default: 'approved' })
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';
}
