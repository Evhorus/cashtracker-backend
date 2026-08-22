import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { AppModule } from './app.module';

const logger = new Logger('CashTrackerApp');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Security
  app.use(helmet());

  // CORS - Allow Next.js frontend
  app.enableCors({
    origin: configService.get<string>('CLIENT_URL'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Let Nest close TypeORM's pool (and any other OnModuleDestroy hook)
  // cleanly on SIGTERM/SIGINT instead of the process being cut off mid-query
  // when an orchestrator (Docker, k8s) stops the container.
  app.enableShutdownHooks();

  // PORT is already validated with a default by env.validation.ts - read it
  // through ConfigService instead of process.env directly so there's one
  // source of truth for it instead of two (this used to default to 3000
  // here vs. 4000 in the validated config).
  const port = configService.get<number>('PORT', 4000);

  await app.listen(port);
  logger.log(`App is running on port ${port}`);
}

void bootstrap();
