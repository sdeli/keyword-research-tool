import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app-module';
import { UtilsService } from '@shared/utils';
import { UbersuggestAnaliticsParams } from '@process-queue/process-queue.types';
import { ParsedProcessArgsT } from '@shared/shared.types';
import { UbersuggestService } from '@keyword-analizer/ubersuggest/ubersuggest.service';

scrapeAnaliticsForMoreKywsAndUpdateDb();

async function scrapeAnaliticsForMoreKywsAndUpdateDb() {
  try {
    process.send('new process for scrapeAnaliticsForMoreKywsAndUpdateDb started');
    const app = await NestFactory.create(AppModule);
    const { analiticsScrapeSessionId, suggestionsScrapeId } = getUbersuggestAnaliticsParams(app);

    const ubersuggestService: UbersuggestService = app.get('UbersuggestService');
    process.send('scrapeAnaliticsForMoreKywsAndUpdateDb starts');
    await ubersuggestService.scrapeAnaliticsForMoreKywsAndUpdateDb(analiticsScrapeSessionId, suggestionsScrapeId);

    process.send('new process scrapeAnaliticsForMoreKywsAndUpdateDb finished');
  } catch (err) {
    throw new Error(err);
  }
}

function getUbersuggestAnaliticsParams(app: INestApplication): UbersuggestAnaliticsParams {
  const utilsService: UtilsService = app.get('UtilsService');
  const args: ParsedProcessArgsT = utilsService.getParsedProcessArgs();
  process.send(args);
  if (!args.analiticsScrapeSessionId) throw new Error('analiticsScrapeSessionId missing');
  if (!args.suggestionsScrapeId) throw new Error('suggestionsScrapeId missing');

  return {
    analiticsScrapeSessionId: args.analiticsScrapeSessionId,
    suggestionsScrapeId: args.suggestionsScrapeId,
  };
}
