import * as dotenv from 'dotenv';
const err = dotenv.config({ path: '/home/sandor/Projects/keyword-research-tool/.env' });
console.log(err);
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
