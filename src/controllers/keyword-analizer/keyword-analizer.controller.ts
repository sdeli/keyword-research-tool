import { Controller, Post, Get, Header, Param } from '@nestjs/common';
import { KeywordAnalizerService } from './keyword-analizer.service';

@Controller('keyword')
export class KeywordAnalizerController {
  constructor(private readonly service: KeywordAnalizerService) {}

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

  @Get('analize-one/:keyword/:deepness')
  analizeOne(@Param('keyword') keyword: string, @Param('deepness') deepness: number) {
    this.service.analizeOne(keyword, deepness);
  }
}
