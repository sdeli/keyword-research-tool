import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { UtilsModule } from '@utils/utils.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordIoConfigI, UbersuggestConfigI } from './keyword-analizer.interfaces';
import { KEYWORD_ANALIZER_CONFIG_TOKEN } from './keyword-analizer.types';
import { config } from '@config';
import { GoogleSerpLinks } from './entities/google-serp.entity';
import { Keyword } from './entities/keyword.entity';
import { MasterKeyword } from './entities/master-keyword.entity';
import { KeywordAnalizerController } from './keyword-analizer.controller';
import { KeywordIoService } from './keyword-io/keyword-io.service';

const keywordAnalizerConfig: KeywordIoConfigI = config.KeywordIo;
const UbersuggestConfig: UbersuggestConfigI = config.KeywordIo;

@Module({
  imports: [TypeOrmModule.forFeature([Keyword, MasterKeyword, GoogleSerpLinks]), UtilsModule],
  controllers: [KeywordAnalizerController],
  providers: [
    KeywordIoService,
    {
      provide: KEYWORD_ANALIZER_CONFIG_TOKEN,
      useValue: keywordAnalizerConfig,
    },
    UbersuggestService,
  ],
})
export class KeywordAnalizerModule {}
