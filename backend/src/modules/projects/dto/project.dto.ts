import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'E-Commerce QA Project' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Automated test suite for online store', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddProjectMemberDto {
  @ApiProperty()
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'developer', default: 'viewer' })
  @IsString()
  role: string;
}
