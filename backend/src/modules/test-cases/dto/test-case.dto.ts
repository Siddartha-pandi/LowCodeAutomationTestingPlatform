import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestCaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({ example: 'Verify User Login with Valid Credentials' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  test_case: Record<string, any>;
}

export class UpdateTestCaseDto {
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
  test_case?: Record<string, any>;
}

export class ExecuteTestCaseDto {
  @ApiProperty({ required: false })
  @IsOptional()
  test_data_row?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  environment_id?: string;
}

export class SeedLegacyTestsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;
}
