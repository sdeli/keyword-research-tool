import * as dotenv from 'dotenv';
const err = dotenv.config({ path: '/Users/sandordeli/Projects/keyword-research-tool/.env' });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
