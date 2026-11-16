import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ example: 'developer' })
  @IsString()
  role_name: string;
}
