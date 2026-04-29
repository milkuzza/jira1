// apps/api/src/main.ts
// NestJS bootstrap: Helmet, CORS, ValidationPipe, Swagger, GlobalExceptionFilter.

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { SWAGGER_CONFIG } from './constants';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);

  // ─── Security ──────────────────────────────────
  app.use(helmet());

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const allowedOriginsEnv = configService.get<string>('ALLOWED_ORIGINS', '');
  const allowedOrigins: (string | RegExp)[] =
    nodeEnv === 'production'
      ? allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
      : [
          /^https?:\/\/localhost(:\d+)?$/,
          /^https?:\/\/app\.localhost(:\d+)?$/,
          /^https?:\/\/.*\.app\.localhost(:\d+)?$/,
        ];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  // ─── Global Pipes ──────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Filters ───────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Swagger ────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle(SWAGGER_CONFIG.TITLE)
    .setDescription(SWAGGER_CONFIG.DESCRIPTION)
    .setVersion(SWAGGER_CONFIG.VERSION)
    .addBearerAuth()
    .addTag('Health', 'Health check endpoints')
    .addTag('Tenants', 'Tenant management')
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Users', 'User management')
    .addTag('Projects', 'Project management')
    .addTag('Issues', 'Issue (task) management')
    .addTag('Search', 'Full-text search')
    .addTag('Notifications', 'Notification system')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_CONFIG.PATH, app, document);

  // ─── Process-level error safety nets ────────
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', String(reason));
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err.stack ?? String(err));
  });

  // ─── Start ──────────────────────────────────
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/${SWAGGER_CONFIG.PATH}`);
}

bootstrap();
