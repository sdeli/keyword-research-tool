import { GetPageOnKeywordIoService } from './get-page-on-keyword-io/get-page-on-keyword-io.service';
import { UtilsModule } from '@utils/utils.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeywordAnalizerConfigI } from './keyword-analizer.interfaces';
import { KEYWORD_ANALIZER_CONFIG_TOKEN } from './keyword-analizer.types';
import { config } from '@config';
import { GoogleSerpLinks } from './entities/google-serp.entity';
import { Keyword } from './entities/keyword.entity';
import { MasterKeyword } from './entities/master-keyword.entity';
import { KeywordAnalizerController } from './keyword-analizer.controller';
import { KeywordAnalizerService } from './keyword-analizer.service';

const keywordAnalizerConfig: KeywordAnalizerConfigI = config.KeywordIo;

@Module({
  imports: [TypeOrmModule.forFeature([Keyword, MasterKeyword, GoogleSerpLinks]), UtilsModule],
  controllers: [KeywordAnalizerController],
  providers: [
    KeywordAnalizerService,
    {
      provide: KEYWORD_ANALIZER_CONFIG_TOKEN,
      useValue: keywordAnalizerConfig,
    },
    GetPageOnKeywordIoService,
  ],
})
export class KeywordAnalizerModule {}
