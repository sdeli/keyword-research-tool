import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { UtilsModule } from '@utils/utils.module';
import { UtilsService } from '@utils/utils.service';
import { PuppeteerUtilsModule } from './shared/puppeteer-utils/puppeteer-utils.module';

@Module({
  imports: [
    KeywordAnalizerModule,
    TypeOrmModule.forRoot({ keepConnectionAlive: true }),
    UtilsModule,
    PuppeteerUtilsModule,
  ],
  controllers: [],
  providers: [AppService, UtilsService],
})
export class AppModule {}
