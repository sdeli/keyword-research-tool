import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { AppService } from './app.service';
import { ScrapeWorkflowModule } from '@scrape-workflow/scrape-workflow.module';
import { UtilsModule } from '@shared/utils';

@Module({
  imports: [
    KeywordAnalizerModule,
    TypeOrmModule.forRoot({ keepConnectionAlive: true }),
    ScrapeWorkflowModule,
    UtilsModule,
  ],
  controllers: [],
  providers: [AppService],
  exports: [UtilsModule],
})
export class AppModule {}
