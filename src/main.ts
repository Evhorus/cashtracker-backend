import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { validateEnv } from './config/env.validation';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Validate environment variables before starting
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // CORS - Allow Next.js frontend
  app.enableCors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(env.PORT);
  logger.log(`🚀 Application is running on: http://localhost:${env.PORT}/api`);
}

// Global error handlers to catch crashes
process.on('unhandledRejection', (reason: Error | any) => {
  logger.error('❌ UNHANDLED PROMISE REJECTION - Process will exit');
  logger.error(reason);
  logger.error(reason?.stack);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('❌ UNCAUGHT EXCEPTION - Process will exit');
  logger.error(error.message);
  logger.error(error.stack);
  process.exit(1);
});

void bootstrap();
