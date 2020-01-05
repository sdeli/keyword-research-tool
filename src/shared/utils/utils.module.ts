import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UtilsService } from './utils.service';
import { UtilsConfigI } from './utils.interfaces';
import { config } from '@config';
import { UTILS_CONFIG_TOKEN } from './utils.types';
import { ScrapeSession } from '@shared/entities/scrape-session.entity';

const UtilsConfig: UtilsConfigI = config.utils;

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeSession])],
  providers: [
    UtilsService,
    {
      provide: UTILS_CONFIG_TOKEN,
      useValue: UtilsConfig,
    },
  ],
  exports: [UtilsService],
})
export class UtilsModule {}
