import uuidv1 from 'uuid/v1';
import { Controller, Get, Header, Param } from '@nestjs/common';

import { UbersuggestService } from './ubersuggest/ubersuggest.service';
import { KeywordIoService } from './keyword-io/keyword-io.service';
import { ProcessQueueService } from '@process-queue/process-queue/process-queue.service';
import { UbersuggestAnaliticsParams } from '@process-queue/process-queue.types';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('keyword')
export class KeywordAnalizerController {
  constructor(
    private readonly kywIoService: KeywordIoService,
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

  @Get('suggestions/:keyword')
  getKeywordSuggestionsForOne(@Param('keyword') keyword: string) {
    const scrapeSessionId = uuidv1();
    this.kywIoService.scrapeSuggestionsForOneAndSaveInDb(scrapeSessionId, keyword).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }

  @Get('analitics/keyword/:keyword')
  async scrapeAnaliticsForOneAndSaveInDb(@Param('keyword') keyword: string) {
    const scrapeSessionId = uuidv1();
    this.ubersuggestService.scrapeAnaliticsForOneAndSaveInDb(scrapeSessionId, keyword).catch(err => {
      console.error(err);
    });

    return scrapeSessionId;
  }

  @Get('analitics/session/:session')
  async scrapeAnaliticsForMoreAndSaveInDb(@Param('session') suggestionsScrapeId: string) {
    const analiticsConf = new UbersuggestAnaliticsParams({
      analiticsScrapeSessionId: uuidv1(),
      suggestionsScrapeId,
    });

    console.log('starting new analitics robot with conf:');
    console.log(analiticsConf);
    this.processQueueService.register(analiticsConf);

    return analiticsConf.analiticsScrapeSessionId;
  }

  @Get('test/')
  async test() {
    const err = await this.ubersuggestService.updateAnaliticsScrapeSessionWithError(
      'cc86ade0-3fcf-11ea-b570-bb22111bf080',
      new Error('faszkivan'),
    );
    console.log(err);
  }
}
