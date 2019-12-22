import { Module } from '@nestjs/common';

import { UtilsService } from './utils/utils.service';
import { PuppeteerUtilsService } from './puppeteer-utils/pupeteer-utils.service';
import { PreparePageForDetection } from './puppeteer-utils/prepare-page-for-detection/prepare-page-for-detection';
import { UtilsConfigI } from './utils.interfaces';
import { config } from '@config';
import { UTILS_CONFIG_TOKEN } from './utils.types';

const UtilsConfig: UtilsConfigI = config.utils;

@Module({
  providers: [
    PuppeteerUtilsService,
    UtilsService,
    PreparePageForDetection,
    {
      provide: UTILS_CONFIG_TOKEN,
      useValue: UtilsConfig,
    },
  ],
  exports: [PuppeteerUtilsService, UtilsService],
})
export class UtilsModule {}
