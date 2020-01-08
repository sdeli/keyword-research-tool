import { Injectable } from '@nestjs/common';
import rp from 'request-promise';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { Repository } from 'typeorm';
import { UtilsService } from '@shared/utils';
import { ScrapeWorkflow } from '@scrape-workflow/entities/scrape-workflow.entity';

@Injectable()
export class ScrapeWorkflowService {
  constructor(
    @InjectRepository(ScrapeWorkflow) private readonly scrapeWorkflowRepo: Repository<ScrapeWorkflow>,
    @InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>,
    private readonly utils: UtilsService,
  ) {}

  async analizeKeywordsOfOne(keyword: string) {
    console.log(`analizing keywords for: ${keyword}`);
    const scrapeSuggestionsForOneAndSaveInDbEp = `http://localhost:3000/keyword/suggestions/${keyword}`;
    // const scrapeAnaliticsForMoreKywsAndUpdateDbEp = 'http://localhost:3000/keyword/analitics/';
    const currPath = '/scrape-workflow/:keyword';

    try {
      // tslint:disable-next-line:no-var-keyword prefer-const
      var scrapeWorflow = await this.saveScrapeWorkflow(currPath);
      console.log('scrape workflow saved');

      const suggestionsScrapeId: string = await rp.get(scrapeSuggestionsForOneAndSaveInDbEp);
      console.log(`suggestion-scrape id: ${suggestionsScrapeId}`);

      const suggestionScrapeSession = await this.waitUntilSuggestionScrapeFinished(suggestionsScrapeId);
      console.log('suggestion scrape finished');

      scrapeWorflow.scrapeSessions = [suggestionScrapeSession];
      await this.scrapeWorkflowRepo.save(scrapeWorflow);
      console.log('suggestions scrape session added to worflow');

      if (!suggestionScrapeSession.isSuccesful) return false;
      console.log('suggestions scrape session was succesful');
    } catch (e) {
      console.log(e);
      scrapeWorflow.isSuccesful = false;
      scrapeWorflow.error = e;
      await this.scrapeWorkflowRepo.save(scrapeWorflow);
    }
  }

  private saveScrapeWorkflow(path: string) {
    const scrapeWorflow = new ScrapeWorkflow();
    scrapeWorflow.path = path;

    return this.scrapeWorkflowRepo.save(scrapeWorflow);
  }

  private async waitUntilSuggestionScrapeFinished(suggestionsScrapeId: string) {
    let i = 0;
    const maxPollCount = 150;
    let isSuggestionsScrapeFinished = false;

    while (!isSuggestionsScrapeFinished && i < maxPollCount) {
      const suggestionScrapeSession = await this.getScrapeSession(suggestionsScrapeId);
      console.log(`is suggestion scrape finished?: ${isSuggestionsScrapeFinished}`);
      if (suggestionScrapeSession) {
        isSuggestionsScrapeFinished = true;
        return suggestionScrapeSession;
      }

      i++;
      await this.utils.wait(2000);
    }
  }

  private async getScrapeSession(scrapeSessionId: string) {
    return this.scrapeSessionRepo.findOne({ where: { id: scrapeSessionId } });
  }
}
