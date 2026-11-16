import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/credential.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Credentials Vault')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'List stored credentials with secrets masked' })
  async listCredentials(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.credentialsService.listCredentials(projectId, userId, isSuperuser);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an encrypted credential record' })
  async createCredential(
    @Body() dto: CreateCredentialDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.credentialsService.createCredential(dto, userId, isSuperuser);
  }

  @Get(':credential_id')
  @ApiOperation({ summary: 'Get credential metadata (secret masked)' })
  async getCredential(
    @Param('credential_id') credId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.credentialsService.getCredential(credId, userId, isSuperuser);
  }

  @Put(':credential_id')
  @ApiOperation({ summary: 'Update credential secret or metadata' })
  async updateCredential(
    @Param('credential_id') credId: string,
    @Body() dto: UpdateCredentialDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    return this.credentialsService.updateCredential(credId, dto, userId, isSuperuser);
  }

  @Delete(':credential_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete credential record' })
  async deleteCredential(
    @Param('credential_id') credId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperuser') isSuperuser: boolean,
  ) {
    await this.credentialsService.deleteCredential(credId, userId, isSuperuser);
  }
}
