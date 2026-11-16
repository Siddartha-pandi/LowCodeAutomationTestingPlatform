import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCredentialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({ example: 'Staging Admin Credentials' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'password', default: 'password' })
  @IsString()
  credential_type: string;

  @ApiProperty({ example: 'admin@staging.internal', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'P@ssword123!' })
  @IsString()
  @IsNotEmpty()
  secret_value: string;

  @ApiProperty({ example: 'staging.internal', required: false })
  @IsString()
  @IsOptional()
  domain_scope?: string;
}

export class UpdateCredentialDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  credential_type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  secret_value?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  domain_scope?: string;
}
