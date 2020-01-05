import { Controller, Get, Header, Param } from '@nestjs/common';
import { ScrapeWorkflowService } from './scrape-workflow/scrape-workflow.service';

@Controller('scrape-workflow')
export class ScrapeWorkflowController {
  constructor(private readonly scrapeManagerService: ScrapeWorkflowService) {}

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

  @Get(':keyword')
  analizeKeywordsOfOne(@Param('keyword') keyword: string) {
    this.scrapeManagerService.analizeKeywordsOfOne(keyword).catch(e => {
      console.error(e);
    });
  }
}
