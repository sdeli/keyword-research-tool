import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordIoConfigI, UbersuggestConfigI } from './keyword-analizer.interfaces';
import { KEYWORD_IO_CONFIG_TOKEN, UBERSUGGEST_CONFIG_TOKEN } from './keyword-analizer.types';
import { config } from '@config';
import { GoogleSerpLinks } from './entities/google-serp.entity';
import { Keyword } from './entities/keyword.entity';
import { MasterKeyword } from './entities/master-keyword.entity';
import { KeywordAnalizerController } from './keyword-analizer.controller';
import { KeywordIoService } from './keyword-io/keyword-io.service';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { PuppeteerUtilsModule } from '@puppeteer-utils/puppeteer-utils.module';
import { UtilsModule } from '@shared/utils';

const keywordAnalizerConfig: KeywordIoConfigI = config.KeywordIo;
const ubersuggestConfig: UbersuggestConfigI = config.ubersuggest;
const globalConfig: GlobalConfigI = config.global;

@Module({
  imports: [TypeOrmModule.forFeature([Keyword, MasterKeyword, GoogleSerpLinks]), PuppeteerUtilsModule, UtilsModule],
  controllers: [KeywordAnalizerController],
  providers: [
    KeywordIoService,
    UbersuggestService,
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
})
export class KeywordAnalizerModule {}
