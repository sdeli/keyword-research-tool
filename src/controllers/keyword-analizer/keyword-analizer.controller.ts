import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { Controller, Get, Header, Param } from '@nestjs/common';
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
    this.kywIoService.getSuggestionsForOne(keyword);
  }

  @Get('analitics/:keyword')
  getKeywordAnaliticsForOne(@Param('keyword') keyword: string) {
    this.ubersuggestService.getAnaliticsForOne(keyword);
  }
}
