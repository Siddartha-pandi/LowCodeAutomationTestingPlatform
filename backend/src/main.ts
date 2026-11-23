import dns from 'node:dns';

// Force Node.js to prefer IPv4 over IPv6 across all database and network sockets
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppWsAdapter } from './common/adapters/app-ws.adapter';

declare const module: any;

async function bootstrap() {
  const logger = new Logger('UnifiedBackendBootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 8000;
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // 1. CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        corsOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy rejection: origin ${origin} not allowed.`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Internal-Service-Key,X-Correlation-ID',
  });

  // 2. Cookie Parser Middleware
  const parseCookies = typeof cookieParser === 'function' ? cookieParser : (cookieParser as any)?.default;
  app.use(parseCookies());

  // 3. Global Exception Handling & Logging
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 4. Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4.1. WebSocket Adapter (supports exact and prefix matching /ws/executions/:id)
  app.useWebSocketAdapter(new AppWsAdapter(app));

  // 5. Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('LowCodeAutomationTestingPlatform API')
    .setDescription('Unified NestJS Backend for Visual Flow & Playwright Automation Testing')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addApiKey(
      { type: 'apiKey', name: 'X-Internal-Service-Key', in: 'header' },
      'internal-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // 6. Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // 7. Start HTTP Server
  await app.listen(port, '0.0.0.0');
  const isEmbeddedWorker = process.env.EMBED_WORKER !== 'false';
  logger.log('================================================================');
  logger.log(`🚀 Unified NestJS API Backend is Running on Port ${port}`);
  logger.log(`   Healthcheck: http://localhost:${port}/health`);
  logger.log(`   Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`   API v1 Base: http://localhost:${port}/api/v1/*`);
  logger.log(`   Embedded Worker: ${isEmbeddedWorker ? 'Active (All-in-One Mode: BullMQ + Playwright)' : 'Disabled (Standalone Mode)'}`);
  logger.log('================================================================');

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap().catch((err) => {
  const logger = new Logger('UnifiedBackendBootstrap');
  logger.error(`Fatal error in API bootstrap: ${err.message}`, err.stack);
  process.exit(1);
});
