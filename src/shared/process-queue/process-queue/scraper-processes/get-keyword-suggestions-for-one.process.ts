import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { UtilsService } from '@shared/utils';
import { KeywordIoScraperParams } from '@process-queue/process-queue.types';
import { ParsedProcessArgsT } from '@shared/shared.types';
import { KeywordIoService } from '@keyword-analizer/keyword-io/keyword-io.service';
import { supportedLanguages } from '@keyword-analizer/keyword-analizer.types';

getKeywordSuggestionsForOne().catch(err => console.error(err));

async function getKeywordSuggestionsForOne() {
  let suggestionsScrapeSessionId: string;

  try {
    process.send('new process for getKeywordSuggestionsForOne started');
    const keywordAnlizerApp = await NestFactory.create(KeywordAnalizerModule);
    // tslint:disable-next-line: prefer-const no-var-keyword
    const params = getSuggestionsParams(keywordAnlizerApp);
    suggestionsScrapeSessionId = params.suggestionsScrapeSessionId;

    // tslint:disable-next-line: prefer-const no-var-keyword
    var keywordIoService: KeywordIoService = keywordAnlizerApp.get('KeywordIoService');
    process.send('getKeywordSuggestionsForOne starts');
    await keywordIoService.scrapeSuggestionsForOneAndSaveInDb(params);

    process.send('process getKeywordSuggestionsForOne finished');
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
  if (!args.lang) throw new Error('lang missing');
  if (!supportedLanguages[args.lang]) throw new Error(`this language: ${args.lang} is not supported`);

  process.send(
    `launching suggestions scraper with these params:\nsuggestionsScrapeSessionId: ${args.suggestionsScrapeSessionId}\nkeyword: ${args.keyword}\nlanguage: ${args.lang}`,
  );

  return {
    suggestionsScrapeSessionId: args.suggestionsScrapeSessionId,
    keyword: args.keyword,
    lang: args.lang as supportedLanguages,
  };
}
