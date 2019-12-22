import { UbersuggestService } from './controllers/keyword-analizer/ubersuggest/ubersuggest.service';
import { KeywordAnalizerModule } from './controllers/keyword-analizer/keyword-analizer.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { UtilsModule } from './shared/utils/utils.module';
import { UtilsService } from './shared/utils/utils/utils.service';

@Module({
  imports: [KeywordAnalizerModule, TypeOrmModule.forRoot({ keepConnectionAlive: true }), UtilsModule],
  controllers: [],
  providers: [UbersuggestService, AppService, UtilsService],
})
export class AppModule {}
