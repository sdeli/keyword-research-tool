import { Module } from '@nestjs/common';

import { UtilsService } from './utils.service';
import { UtilsConfigI } from './utils.interfaces';
import { config } from '@config';
import { UTILS_CONFIG_TOKEN } from './utils.types';

const UtilsConfig: UtilsConfigI = config.utils;

@Module({
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
