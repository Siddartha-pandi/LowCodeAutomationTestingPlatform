import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { ProjectsModule } from '../projects/projects.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnvironmentEntity]),
    ProjectsModule,
    CredentialsModule,
  ],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
