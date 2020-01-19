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
    let scrapeAnaliticsForMoreKywsAndUpdateDbEp = 'localhost:3000/keyword/analitics/session/';
    const currPath = '/scrape-workflow/:keyword';

    try {
      // tslint:disable-next-line:no-var-keyword prefer-const
      var scrapeWorflow = await this.saveScrapeWorkflow(currPath);
      console.log('scrape workflow saved');

      const suggestionsScrapeId: string = await rp.get(scrapeSuggestionsForOneAndSaveInDbEp);
      console.log(`suggestion-scrape id: ${suggestionsScrapeId}`);

      const suggestionScrapeSession = await this.waitUntilHaveSuggestionsInDb(suggestionsScrapeId);
      console.log(`suggestions scrape session was succesful: ${suggestionScrapeSession.isSuccesful}`);

      scrapeWorflow.scrapeSessions = [suggestionScrapeSession];
      await this.scrapeWorkflowRepo.save(scrapeWorflow);
      console.log('suggestions scrape session added to worflow');

      scrapeAnaliticsForMoreKywsAndUpdateDbEp += suggestionsScrapeId;
      const analiticsScrapeId: string = await rp.get(scrapeAnaliticsForMoreKywsAndUpdateDbEp);
      console.log(`analitics-scrape id: ${analiticsScrapeId}`);
    } catch (e) {
      console.log(e);
      scrapeWorflow.isSuccesful = false;
      scrapeWorflow.error = e;
      await this.scrapeWorkflowRepo.save(scrapeWorflow);
      console.log('scrape workflow has been updated with error');
    }
  }

  private saveScrapeWorkflow(path: string) {
    const scrapeWorflow = new ScrapeWorkflow();
    scrapeWorflow.path = path;

    return this.scrapeWorkflowRepo.save(scrapeWorflow);
  }

  private async waitUntilHaveSuggestionsInDb(suggestionsScrapeId: string) {
    console.log(
      `checking if has already keyword suggestions in db for current suggestion scrape session: ${suggestionsScrapeId}`,
    );

    let i = 0;
    let hasAlreadySavedkeywSuggestions = false;
    let didntFindSuggestionsI = 0;
    let suggestionScrapeSessionIsBroken = false;
    const maxPollCount = 150;

    while (!hasAlreadySavedkeywSuggestions && !suggestionScrapeSessionIsBroken && i < maxPollCount) {
      const suggestionScrapeSession = await this.getScrapeSessionWithSuggestions(suggestionsScrapeId);

      if (suggestionScrapeSessionIsBroken) {
        console.log('suggestion scrape session is not found');
        throw new Error('suggestion scrape session is not found');
      }

      if (!suggestionScrapeSession) {
        console.log(`didnt find scrape session: ${didntFindSuggestionsI}`);
        didntFindSuggestionsI++;
        suggestionScrapeSessionIsBroken = didntFindSuggestionsI > 25;
        continue;
      }

      hasAlreadySavedkeywSuggestions = suggestionScrapeSession.keywords.length > 0;
      console.log(`has already saved keyword suggestions: ${hasAlreadySavedkeywSuggestions}`);
      if (hasAlreadySavedkeywSuggestions) {
        return suggestionScrapeSession;
      }

      i++;
      await this.utils.wait(2000);
    }
  }

  private async getScrapeSessionWithSuggestions(scrapeSessionId: string) {
    // sSRelnames => scrapeSessionRelNames
    const sSRelnames = ScrapeSession.getRelationNames();
    return this.scrapeSessionRepo.findOne({
      relations: [sSRelnames.keywords],
      where: { id: scrapeSessionId },
    });
  }
}
