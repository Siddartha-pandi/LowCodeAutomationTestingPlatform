import { forwardRef, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfMiddleware } from './common/security/csrf.middleware';
import { appConfig } from './config/configuration';
import { validateEnvironment } from './config/env.validation';
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
import { WorkersModule } from './workers/workers.module';

const isEmbeddedWorkerEnabled = process.env.EMBED_WORKER !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    QueueModule,
    forwardRef(() => BrowserModule),
    forwardRef(() => SelectorsModule),
    forwardRef(() => ActionsModule),
    forwardRef(() => AssertionsModule),
    forwardRef(() => ScreenshotsModule),
    forwardRef(() => MonitoringModule),
    forwardRef(() => ChangeDetectionModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => EnvironmentsModule),
    forwardRef(() => CredentialsModule),
    forwardRef(() => FlowsModule),
    forwardRef(() => TestCasesModule),
    forwardRef(() => TestSuitesModule),
    forwardRef(() => ExecutionsModule),
    forwardRef(() => ReportsModule),
    forwardRef(() => ArtifactsModule),
    forwardRef(() => AuditModule),
    forwardRef(() => SchedulingModule),
    ...(isEmbeddedWorkerEnabled ? [forwardRef(() => WorkersModule)] : []),
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
