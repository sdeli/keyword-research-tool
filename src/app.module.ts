import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { UtilsModule } from '@utils/utils.module';
import { UtilsService } from '@utils/utils/utils.service';

@Module({
  imports: [KeywordAnalizerModule, TypeOrmModule.forRoot({ keepConnectionAlive: true }), UtilsModule],
  controllers: [],
  providers: [AppService, UtilsService],
})
export class AppModule {}
