import uuidv1 from 'uuid/v1';
import { Controller, Get, Header, Query } from '@nestjs/common';

import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { ProcessQueueService } from '@process-queue/process-queue/process-queue.service';
import { UbersuggestAnaliticsParams, KeywordIoScraperParams } from '@process-queue/process-queue.types';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { supportedLanguages } from './keyword-analizer.types';
import { LanguagePipe } from './pipes/language.pipe';

@Controller('keyword')
export class KeywordAnalizerController {
  constructor(
    private readonly ubersuggestService: UbersuggestService,
    private readonly processQueueService: ProcessQueueService,
    @InjectRepository(Keyword) private readonly keywordRepo: Repository<Keyword>,
  ) {}

  @Get()
  @Header('content-type', 'text/plain')
  async index() {
    console.log(process.cwd());
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

  @Get('suggestions/one')
  getKeywordSuggestionsForOne(
    @Query('keyword') keyword: string,
    @Query('lang', LanguagePipe) lang: supportedLanguages,
  ) {
    const params = new KeywordIoScraperParams({
      suggestionsScrapeSessionId: uuidv1(),
      keyword,
      lang,
    });

    this.processQueueService.register(params);

    return params.suggestionsScrapeSessionId;
  }

  @Get('analitics/one')
  async scrapeAnaliticsForOneAndSaveInDb(
    @Query('keyword') keyword: string,
    @Query('lang', LanguagePipe) lang: supportedLanguages,
  ) {
    const scrapeSessionId = uuidv1();
    this.ubersuggestService.scrapeAnaliticsForOneAndSaveInDb(scrapeSessionId, keyword, lang).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }

  @Get('analitics/more')
  async scrapeAnaliticsForMoreAndSaveInDb(
    @Query('session') suggestionsScrapeId: string,
    @Query('lang', LanguagePipe) lang: supportedLanguages,
  ) {
    const analiticsConf = new UbersuggestAnaliticsParams({
      analiticsScrapeSessionId: uuidv1(),
      suggestionsScrapeId,
      lang,
    });

    this.processQueueService.register(analiticsConf);

    return analiticsConf.analiticsScrapeSessionId;
  }

  // @Get('kill-analitics-scraper')
  // async killAnaliticsScraper(@Query('scraperId') scraperId: string) {
  //   this.processQueueService.register(analiticsConf);

  //   return analiticsConf.analiticsScrapeSessionId;
  // }

  // @Get('test')
  // async test() {
  //   console.log(supportedLanguages['eng']);
  //   console.log(supportedLanguages['majom']);
  // }
}
