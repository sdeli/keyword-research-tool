import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { AppService } from './app.service';
import { UtilsModule } from '@utils/utils.module';
import { PuppeteerUtilsModule } from '@puppeteer-utils/puppeteer-utils.module';
import { ScrapeWorkflowModule } from './controllers/scrape-workflow/scrape-workflow.module';

@Module({
  imports: [
    KeywordAnalizerModule,
    TypeOrmModule.forRoot({ keepConnectionAlive: true }),
    UtilsModule,
    PuppeteerUtilsModule,
    ScrapeWorkflowModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
