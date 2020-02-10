import { Controller, Get, Header, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ScrapeWorkflowService } from './scrape-workflow/scrape-workflow.service';
import { Repository } from 'typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { supportedLanguages } from '@keyword-analizer/keyword-analizer.types';
import { LanguagePipe } from '@keyword-analizer/pipes/language.pipe';

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
  analizeKeywordsOfOne(
    @Query('keyword') keyword: string,
    @Query('concurrency') concurrency: number = 2,
    @Query('lang', LanguagePipe) lang: supportedLanguages,
  ) {
    this.scrapeManagerService.analizeKeywordsOfOne(keyword, concurrency, lang).catch(e => {
      console.error(e);
    });
  }

  @Get('test')
  async test() {
    await this.scrapeManagerService.isScraperStuck('69052d50-405b-11ea-bc04-ef6420fbb3db');
  }
}
