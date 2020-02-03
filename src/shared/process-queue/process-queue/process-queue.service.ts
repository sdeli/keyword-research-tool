import { Injectable } from '@nestjs/common';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { UbersuggestAnaliticsParams } from '@process-queue/process-queue.types';

const NODE_EXECUTABLE = '/home/sandor/.nvm/versions/node/v10.16.3/bin/node';
const SCRAPE_ANALITICS_FOR_MORE_KYWS_AND_UPDATE_DB_PATH = `${__dirname}/scraper-processes/scrape-analitics-for-more-kyws-and-update-db-process.js`;

@Injectable()
export class ProcessQueueService {
  private queue = {};

  register(scraperParams: UbersuggestAnaliticsParams) {
    const processId = this.getProcessId(scraperParams);
    if (this.isAlreadyRegistered(processId)) return false;

    this.queue[processId] = this.runScraperProcess(scraperParams, processId);
  }

  kill(processId: string) {
    const scraperProcess = this.queue[processId];
    if (!scraperProcess) return false;

    scraperProcess.kill('SIGINT');
  }

  private getProcessId(scraperParams: UbersuggestAnaliticsParams): string {
    const is = scraperParams instanceof UbersuggestAnaliticsParams;
    if (is) {
      return scraperParams.analiticsScrapeSessionId;
    }
  }

  private isAlreadyRegistered(uuid: string) {
    const scraperProc = this.queue[uuid];

    return !!scraperProc;
  }

  private runScraperProcess(scraperParams: UbersuggestAnaliticsParams, processId: string) {
    const spawnOpts: SpawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        JUST_SCRAPER_MODE: 'true',
      },
    };

    const scraperParamsOnShell = this.getScrapeProcessParams(scraperParams, processId);

    let scraperProc = spawn(NODE_EXECUTABLE, scraperParamsOnShell, spawnOpts);

    scraperProc = this.setScrapeProcessEventHandlers(scraperProc, processId);

    return scraperProc;
  }

  private getScrapeProcessParams(scraperParams: UbersuggestAnaliticsParams, processId: string): string[] {
    const scraperParamsOnShell = [];

    if (scraperParams instanceof UbersuggestAnaliticsParams) {
      // scraperParamsOnShell.push('--inspect-brk=0.0.0.0:9000');
      scraperParamsOnShell.push(SCRAPE_ANALITICS_FOR_MORE_KYWS_AND_UPDATE_DB_PATH);
    }

    for (const scrapeParamKey in scraperParams) {
      if (!scraperParams.hasOwnProperty(scrapeParamKey)) continue;

      const namedParam = `${scrapeParamKey}=${scraperParams[scrapeParamKey]}`;
      scraperParamsOnShell.push(namedParam);
    }

    return scraperParamsOnShell;
  }

  private setScrapeProcessEventHandlers(scraperProc: ChildProcess, processId: string) {
    scraperProc.on('message', data => {
      console.log(`proc-${processId}: ${data}`);
    });

    scraperProc.stdout.on('data', data => {
      console.log(`proc-${processId}: ${data.toString()}`);
    });

    scraperProc.stderr.on('data', data => {
      console.log(`proc-${processId} err:\n ${data.toString()}`);
    });

    scraperProc.on('exit', data => {
      console.log(`proc-${processId} exited with err:\n ${data.toString()}`);
    });

    return scraperProc;
  }
}
