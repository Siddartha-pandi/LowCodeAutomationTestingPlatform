import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrowserManagerService } from './browser-manager.service';
import { ContextManagerService } from './context-manager.service';
import { PageManagerService } from './page-manager.service';
import { InteractiveSessionService } from './interactive-session.service';
import { BrowserController } from './browser.controller';
import { RecorderController } from './recorder.controller';
import { DomController } from './dom.controller';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationDefinitionEntity, DefinitionVersionEntity]),
    ProjectsModule,
  ],
  controllers: [BrowserController, RecorderController, DomController],
  providers: [
    BrowserManagerService,
    ContextManagerService,
    PageManagerService,
    InteractiveSessionService,
  ],
  exports: [
    BrowserManagerService,
    ContextManagerService,
    PageManagerService,
    InteractiveSessionService,
  ],
})
export class BrowserModule {}
