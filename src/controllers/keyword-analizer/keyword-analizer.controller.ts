import uuidv1 from 'uuid/v1';
import { Controller, Get, Header, Param } from '@nestjs/common';

import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { KeywordIoService } from './keyword-io/keyword-io.service';

@Controller('keyword')
export class KeywordAnalizerController {
  constructor(
    private readonly kywIoService: KeywordIoService,
    private readonly ubersuggestService: UbersuggestService,
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

  @Get('suggestions/:keyword')
  getKeywordSuggestionsForOne(@Param('keyword') keyword: string) {
    const scrapeSessionId = uuidv1();
    this.kywIoService.scrapeSuggestionsForOneAndSaveInDb(scrapeSessionId, keyword).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }

  @Get('analitics/:keyword')
  async scrapeAnaliticsForOneAndSaveInDb(@Param('keyword') keyword: string) {
    const scrapeSessionId = uuidv1();
    this.ubersuggestService.scrapeAnaliticsForOneAndSaveInDb(scrapeSessionId, keyword).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }

  @Get('analitics/:scrape-session-id')
  async scrapeAnaliticsForMoreAndSaveInDb(@Param('suggestion-scrape-session-id') suggestionScrapeSessionId: string) {
    const ownScrapeSessionId = uuidv1();

    this.ubersuggestService
      .scrapeAnaliticsForMoreKywsAndUpdateDb(suggestionScrapeSessionId, ownScrapeSessionId)
      .catch(err => {
        console.error(err);
      });

    return ownScrapeSessionId;
  }
}
