// const uuidv1 = require('uuid/v1');
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
    this.kywIoService.getSuggestionsForOne(scrapeSessionId, keyword).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }

  @Get('analitics/:keyword')
  async getKeywordAnaliticsForOne(@Param('keyword') keyword: string) {
    const scrapeSessionId = uuidv1();
    this.ubersuggestService.getAnaliticsForOne(scrapeSessionId, keyword).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }
}
