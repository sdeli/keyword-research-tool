import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { AppService } from './app.service';
import { UtilsModule } from '@utils/utils.module';
import { PuppeteerUtilsModule } from '@puppeteer-utils/puppeteer-utils.module';

@Module({
  imports: [
    KeywordAnalizerModule,
    TypeOrmModule.forRoot({ keepConnectionAlive: true }),
    UtilsModule,
    PuppeteerUtilsModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
