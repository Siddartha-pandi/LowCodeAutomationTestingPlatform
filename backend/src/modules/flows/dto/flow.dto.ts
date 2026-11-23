import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlowDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({ example: 'Customer Onboarding Flow' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  definition?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  flow_graph?: Record<string, any>;
}

export class UpdateFlowDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  definition?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  flow_graph?: Record<string, any>;
}

export class ValidateFlowDto {
  @ApiProperty()
  definition: Record<string, any>;
}

export class ExecuteFlowDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  version_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  environment_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  initial_variables?: Record<string, any>;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  async_exec?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  headless?: boolean;
}
