import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { BrowserModule } from './modules/browser/browser.module';
import { SelectorsModule } from './modules/selectors/selectors.module';
import { ActionsModule } from './modules/actions/actions.module';
import { AssertionsModule } from './modules/assertions/assertions.module';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ChangeDetectionModule } from './modules/change-detection/change-detection.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { FlowsModule } from './modules/flows/flows.module';
import { TestCasesModule } from './modules/test-cases/test-cases.module';
import { TestSuitesModule } from './modules/test-suites/test-suites.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { AuditModule } from './modules/audit/audit.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    DatabaseModule,
    QueueModule,
    BrowserModule,
    SelectorsModule,
    ActionsModule,
    AssertionsModule,
    ScreenshotsModule,
    MonitoringModule,
    ChangeDetectionModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    EnvironmentsModule,
    CredentialsModule,
    FlowsModule,
    TestCasesModule,
    TestSuitesModule,
    ExecutionsModule,
    ReportsModule,
    ArtifactsModule,
    AuditModule,
    SchedulingModule,
  ],
  providers: [
    // Note: ExecutionWorker is intentionally omitted from AppModule to ensure
    // the HTTP API process never registers BullMQ consumers.
  ],
})
export class AppModule {}
