import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { envs } from './config/envs';

async function bootstrap() {
  const logger = new Logger('CashTrackerMain');

  const app = await NestFactory.create(AppModule);
  await app.listen(envs.PORT);

  logger.log(`App running or port ${envs.PORT}`);
}
void bootstrap();
