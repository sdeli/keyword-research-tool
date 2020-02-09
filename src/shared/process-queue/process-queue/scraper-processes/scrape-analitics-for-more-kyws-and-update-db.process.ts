import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { KeywordAnalizerModule } from '@keyword-analizer/keyword-analizer.module';
import { UtilsService } from '@shared/utils';
import { UbersuggestAnaliticsParams } from '@process-queue/process-queue.types';
import { ParsedProcessArgsT } from '@shared/shared.types';
import { UbersuggestService } from '@keyword-analizer/ubersuggest/ubersuggest.service';
import { supportedLanguages } from '@keyword-analizer/keyword-analizer.types';

scrapeAnaliticsForMoreKywsAndUpdateDb().catch(err => console.error(err));

async function scrapeAnaliticsForMoreKywsAndUpdateDb() {
  let analiticsScrapeSessionId: string;

  try {
    process.send('new process for scrapeAnaliticsForMoreKywsAndUpdateDb started123123');
    const keywordAnlizerApp = await NestFactory.create(KeywordAnalizerModule);
    // tslint:disable-next-line: prefer-const no-var-keyword
    const params = getUbersuggestAnaliticsParams(keywordAnlizerApp);
    process.send(params);
    analiticsScrapeSessionId = params.analiticsScrapeSessionId;
    // tslint:disable-next-line: no-var-keyword prefer-const
    var ubersuggestService: UbersuggestService = keywordAnlizerApp.get('UbersuggestService');
    process.send('scrapeAnaliticsForMoreKywsAndUpdateDb starts');

    await ubersuggestService.scrapeAnaliticsForMoreKywsAndUpdateDb(params);

    process.send('new process scrapeAnaliticsForMoreKywsAndUpdateDb finished');
  } catch (err) {
    console.log('error propagated to main level, update scraper with error, closing process');
    await ubersuggestService.updateAnaliticsScrapeSessionWithError(analiticsScrapeSessionId, err);
    throw new Error(err);
  }
}

function getUbersuggestAnaliticsParams(app: INestApplication): UbersuggestAnaliticsParams {
  const utilsService: UtilsService = app.get('UtilsService');
  const args: ParsedProcessArgsT = utilsService.getParsedProcessArgs();

  if (!args.analiticsScrapeSessionId) throw new Error('analiticsScrapeSessionId missing');
  if (!args.suggestionsScrapeId) throw new Error('suggestionsScrapeId missing');
  if (!args.lang) throw new Error('language missing');
  if (!supportedLanguages[args.lang]) throw new Error(`this language: ${args.lang} is not supported`);

  process.send(
    `launching analitics scraper with these params:\nsuggestionsScrapeSessionId: ${args.analiticsScrapeSessionId}\suggestionsScrapeId: ${args.suggestionsScrapeId}\nlanguage: ${args.lang}`,
  );

  return {
    analiticsScrapeSessionId: args.analiticsScrapeSessionId,
    suggestionsScrapeId: args.suggestionsScrapeId,
    lang: args.lang as supportedLanguages,
  };
}
