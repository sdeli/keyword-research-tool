import { Module } from '@nestjs/common';
import { ScrapeWorkflowService } from './scrape-workflow/scrape-workflow.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { UtilsModule } from '@shared/utils';
import { ScrapeWorkflowController } from '@scrape-workflow/scrape-workflow.controller';
import { ScrapeWorkflow } from '@scrape-workflow/entities/scrape-workflow.entity';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeWorkflow, ScrapeSession, Keyword]), UtilsModule],
  providers: [ScrapeWorkflowService],
  controllers: [ScrapeWorkflowController],
})
export class ScrapeWorkflowModule {}
