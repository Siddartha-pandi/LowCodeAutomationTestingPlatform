import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TestSuiteDefinitionDto {
  @ApiProperty({ description: 'List of test case UUIDs included in the suite' })
  @IsArray()
  @IsNotEmpty()
  test_case_ids: string[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  stop_on_failure?: boolean = false;

  @ApiPropertyOptional({ default: 'sequential' })
  @IsString()
  @IsOptional()
  execution_mode?: string = 'sequential';
}

export class CreateTestSuiteDto {
  @ApiProperty({ description: 'Target project UUID' })
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: TestSuiteDefinitionDto })
  @IsNotEmpty()
  test_suite: TestSuiteDefinitionDto;
}

export class UpdateTestSuiteDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: TestSuiteDefinitionDto })
  @IsOptional()
  test_suite?: TestSuiteDefinitionDto;
}

export class ExecuteTestSuiteDto {
  @ApiPropertyOptional({ description: 'Environment UUID' })
  @IsUUID()
  @IsOptional()
  environment_id?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  async_exec?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  test_data_row?: Record<string, any>;
}
