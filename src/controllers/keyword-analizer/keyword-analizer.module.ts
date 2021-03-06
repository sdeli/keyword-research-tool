import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordIoConfigI, UbersuggestConfigI } from './keyword-analizer.interfaces';
import { KEYWORD_IO_CONFIG_TOKEN, UBERSUGGEST_CONFIG_TOKEN } from './keyword-analizer.types';
import { config } from '@config';
import { GoogleSerpLinks } from './entities/google-serp.entity';
import { Keyword } from './entities/keyword.entity';
import { KeywordAnalizerController } from './keyword-analizer.controller';
import { KeywordIoService } from './keyword-io/keyword-io.service';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { PuppeteerUtilsModule } from '@puppeteer-utils/puppeteer-utils.module';
import { UtilsModule } from '@shared/utils';
import { ProcessQueueModule } from '@process-queue/process-queue.module';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { LogInToUbersuggestService } from './ubersuggest/log-in-to-ubersuggest/login-to-ubersuggest.service';
import { MakePageScrapableIfNotService } from './ubersuggest/make-page-scrapable-if-not/make-page-scrapable-if-not.service';

const keywordAnalizerConfig: KeywordIoConfigI = config.KeywordIo;
const ubersuggestConfig: UbersuggestConfigI = config.ubersuggest;
const globalConfig: GlobalConfigI = config.global;

const isRunningInJustScrapersMode = process.env.JUST_SCRAPER_MODE === 'true';

const keywordAnalizerModule = {
  imports: [
    TypeOrmModule.forFeature([Keyword, GoogleSerpLinks, ScrapeSession]),
    PuppeteerUtilsModule,
    UtilsModule,
    ProcessQueueModule,
  ],
  controllers: [],
  providers: [
    KeywordIoService,
    UbersuggestService,
    LogInToUbersuggestService,
    MakePageScrapableIfNotService,
    {
      provide: KEYWORD_IO_CONFIG_TOKEN,
      useValue: keywordAnalizerConfig,
    },
    {
      provide: UBERSUGGEST_CONFIG_TOKEN,
      useValue: ubersuggestConfig,
    },
    {
      provide: GLOBAL_CONFIG_TOKEN,
      useValue: globalConfig,
    },
  ],
  exports: [UbersuggestService],
};

if (isRunningInJustScrapersMode) {
  keywordAnalizerModule.imports.push(TypeOrmModule.forRoot({ keepConnectionAlive: true }));
  keywordAnalizerModule.imports.push(TypeOrmModule.forFeature([Keyword, GoogleSerpLinks, ScrapeSession]));
} else {
  keywordAnalizerModule.controllers.push(KeywordAnalizerController);
  keywordAnalizerModule.imports.push(TypeOrmModule.forFeature([Keyword, GoogleSerpLinks, ScrapeSession]));
}

@Module(keywordAnalizerModule)
export class KeywordAnalizerModule {}
