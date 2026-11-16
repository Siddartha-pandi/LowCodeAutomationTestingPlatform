import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialEntity } from '../../database/entities/credential.entity';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { CryptoVaultService } from './crypto-vault.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([CredentialEntity]), ProjectsModule],
  controllers: [CredentialsController],
  providers: [CredentialsService, CryptoVaultService],
  exports: [CredentialsService, CryptoVaultService],
})
export class CredentialsModule {}
