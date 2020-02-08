import * as dotenv from 'dotenv';
// const err = dotenv.config({ path: '/home/sandor/Projects/keyword-research-tool/.env' });
const err = dotenv.config({ path: `${process.cwd()}/.env` });
if (err.error) throw new Error('parsing .env resulted in error');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
// tslint:disable-next-line: no-floating-promises
bootstrap().catch(err => console.error(err));
