import { Module } from '@nestjs/common';
import { ScrapeWorkflowService } from './scrape-workflow/scrape-workflow.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { UtilsModule } from '@shared/utils';
import { ScrapeWorkflowController } from '@scrape-workflow/scrape-workflow.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeSession]), UtilsModule],
  providers: [ScrapeWorkflowService],
  controllers: [ScrapeWorkflowController],
})
export class ScrapeWorkflowModule {}
