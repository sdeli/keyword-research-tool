import { Module } from '@nestjs/common';
import { PuppeteerUtilsService } from '@shared/puppeteer-utils/pupeteer-utils.service';
import { PreparePageForDetection } from '@shared/puppeteer-utils/prepare-page-for-detection/prepare-page-for-detection';

// wee need this import to extend Page interface in @types/puppeteer
import {} from './puppeteer-mods';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '@puppeteer-utils/entities/session.entity';
import { SessionUser } from '@puppeteer-utils/entities/session-user.entity';
import { config } from '@config';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { UtilsModule } from '@shared/utils';

const globalConfig: GlobalConfigI = config.global;

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionUser]), UtilsModule],
  providers: [
    PuppeteerUtilsService,
    PreparePageForDetection,
    {
      provide: GLOBAL_CONFIG_TOKEN,
      useValue: globalConfig,
    },
  ],
  exports: [PuppeteerUtilsService],
})
export class PuppeteerUtilsModule {}
