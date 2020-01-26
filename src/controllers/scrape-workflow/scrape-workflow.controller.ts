import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ScrapeWorkflowService } from './scrape-workflow/scrape-workflow.service';
import { Repository } from 'typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('scrape-workflow')
export class ScrapeWorkflowController {
  constructor(
    @InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>,
    private readonly scrapeManagerService: ScrapeWorkflowService,
  ) {}

  @Get()
  @Header('content-type', 'text/plain')
  async index() {
    return `

    __,_,\n
    [_|_/\n
     //\n
   _//    __\n
  (_|)   |@@|\n
   \\ \\__ \\--/ __\n
    \\o__|----|  |   __\n
        \\ }{ /\\ )_ / _\\\n
        /\\__/\\ \\__O (__\n
       (--/\\--)    \\__/\n
       _)(  )(_\n
      \`---''---\`

  `;
  }

  @Get('one')
  analizeKeywordsOfOne(@Query('keyword') keyword: string, @Query('concurrency') concurrency: string = '2') {
    const concurrencyNum = parseInt(concurrency);
    this.scrapeManagerService.analizeKeywordsOfOne(keyword, concurrencyNum).catch(e => {
      console.error(e);
    });
  }

  @Get('test')
  async test() {
    await this.scrapeManagerService.isScraperStuck('69052d50-405b-11ea-bc04-ef6420fbb3db');
  }
}
