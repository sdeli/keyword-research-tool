import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { UtilsService } from '@shared/utils';
import { KeywordIoScraperParams } from '@process-queue/process-queue.types';
import { ParsedProcessArgsT } from '@shared/shared.types';
import { KeywordIoService } from '@keyword-analizer/keyword-io/keyword-io.service';

getKeywordSuggestionsForOne();

async function getKeywordSuggestionsForOne() {
  try {
    process.send('new process for getKeywordSuggestionsForOne started');
    const keywordAnlizerApp = await NestFactory.create(KeywordAnalizerModule);
    var { suggestionsScrapeSessionId, keyword } = getSuggestionsParams(keywordAnlizerApp);

    var keywordIoService: KeywordIoService = keywordAnlizerApp.get('KeywordIoService');
    process.send('getKeywordSuggestionsForOne starts');
    await keywordIoService.scrapeSuggestionsForOneAndSaveInDb(suggestionsScrapeSessionId, keyword);

    process.send('new process getKeywordSuggestionsForOne finished');
  } catch (err) {
    console.log('error propagated to main level, update scraper with error, closing process');
    await keywordIoService.updateScrapeSessionWithError(suggestionsScrapeSessionId, err);
    throw new Error(err);
  }
}

function getSuggestionsParams(app: INestApplication): KeywordIoScraperParams {
  const utilsService: UtilsService = app.get('UtilsService');
  const args: ParsedProcessArgsT = utilsService.getParsedProcessArgs();

  if (!args.suggestionsScrapeSessionId) throw new Error('suggestionsScrapeSessionId missing');
  if (!args.keyword) throw new Error('keyword missing');
  process.send('suggestionsScrapeSessionId: ' + args.suggestionsScrapeSessionId);
  process.send('keyword: ' + args.keyword);
  return {
    suggestionsScrapeSessionId: args.suggestionsScrapeSessionId,
    keyword: args.keyword,
  };
}
