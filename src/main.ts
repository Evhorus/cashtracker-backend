import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { validateEnv } from './config/env.validation';

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
  console.log(`🚀 Application is running on: http://localhost:${env.PORT}/api`);
}
void bootstrap();
