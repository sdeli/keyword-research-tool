import { Injectable } from '@nestjs/common';
import rp from 'request-promise';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { Repository } from 'typeorm';
import { UtilsService } from '@shared/utils';
import { ScrapeWorkflow } from '@scrape-workflow/entities/scrape-workflow.entity';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';

const ANALTICS_SCRAPER_PATH = 'analitics/session/:session';
const SCRAPE_ANALTICS_FOR_MORE_KYWS_EP = `http://localhost:3000/keyword/analitics/session`;

@Injectable()
export class ScrapeWorkflowService {
  constructor(
    @InjectRepository(ScrapeWorkflow) private readonly scrapeWorkflowRepo: Repository<ScrapeWorkflow>,
    @InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>,
    @InjectRepository(Keyword) private readonly keywordsRepo: Repository<Keyword>,
    private readonly utils: UtilsService,
  ) {}

  async analizeKeywordsOfOne(keyword: string, concurrencyCount: number) {
    console.log(`analizing keywords for: ${keyword}`);
    const currPath = '/scrape-workflow/:keyword';

    try {
      // tslint:disable-next-line:no-var-keyword prefer-const
      var scrapeWorflow = await this.saveScrapeWorkflow(currPath);
      console.log('scrape workflow saved');

      const suggestionScrapeSession = await this.getSuggestionsIntoDb(keyword);

      scrapeWorflow.scrapeSessions = [suggestionScrapeSession];
      await this.scrapeWorkflowRepo.save(scrapeWorflow);
      console.log('suggestions scrape session added to worflow');

      console.log('getting analitics for all keyword suggestions');
      await this.getAnaliticsForAllSuggestionsWithMultiScrapers(
        scrapeWorflow,
        suggestionScrapeSession.id,
        concurrencyCount,
      );

      console.log('added analitics to all keywords');
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

  private async getSuggestionsIntoDb(keyword: string): Promise<ScrapeSession> {
    const scrapeSuggestionsForOneAndSaveInDbEp = `http://localhost:3000/keyword/suggestions/${keyword}`;
    // tslint:disable-next-line: await-promise
    const suggestionsScrapeId: string = await rp.get(scrapeSuggestionsForOneAndSaveInDbEp);
    console.log(`suggestion-scrape id: ${suggestionsScrapeId}`);

    const suggestionScrapeSession = await this.waitUntilHaveSuggestionsInDb(suggestionsScrapeId);
    console.log(`suggestions scrape session was succesful: ${suggestionScrapeSession.isSuccesful}`);

    return suggestionScrapeSession;
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

      if (!suggestionScrapeSession) {
        console.log(`didnt find scrape session: ${didntFindSuggestionsI}`);
        didntFindSuggestionsI++;
        suggestionScrapeSessionIsBroken = didntFindSuggestionsI > 25;
        await this.utils.wait(2000);
        continue;
      }

      const didntFindAnyKeywords = suggestionScrapeSession.isSuccesful && suggestionScrapeSession.keywords.length === 0;
      if (didntFindAnyKeywords) throw new Error('didnt find any keyword suggestions');

      if (suggestionScrapeSession.error) throw new Error(JSON.stringify(suggestionScrapeSession.error));

      hasAlreadySavedkeywSuggestions = suggestionScrapeSession.keywords.length > 0;
      console.log(`has already saved keyword suggestions: ${hasAlreadySavedkeywSuggestions} `);
      if (hasAlreadySavedkeywSuggestions) {
        return suggestionScrapeSession;
      }

      i++;
      console.log(`still didnt download keyword suggestions: ${i}`);
      await this.utils.wait(2000);
    }

    throw new Error('was unable to scrape keyword suggestions');
  }

  private async getScrapeSessionWithSuggestions(scrapeSessionId: string) {
    // sSRelnames => scrapeSessionRelNames
    const sSRelnames = ScrapeSession.getRelationNames();
    try {
      const kyws = await this.scrapeSessionRepo.findOne({
        relations: [sSRelnames.keywords],
        where: { id: scrapeSessionId },
      });

      return kyws;
    } catch (error) {
      console.log(error);
    }
  }

  private async getAnaliticsForAllSuggestionsWithMultiScrapers(
    scrapeWorflow: ScrapeWorkflow,
    suggestionsScrapeId: string,
    concurrencyCount: number,
  ) {
    while (true) {
      const hasKeywsWithoutAnalitics = await this.hasKeywSuggestionsWithoutAnalitics(suggestionsScrapeId);
      console.log(`has keyword suggestions without analitics: ${hasKeywsWithoutAnalitics}`);
      if (!hasKeywsWithoutAnalitics) return;

      scrapeWorflow = await this.scrapeWorkflowRepo.findOne({ id: scrapeWorflow.id });
      const { runningScrapersCount, stuckScraperIds } = await this.getRunningAnaliticsScrapersCount(
        scrapeWorflow.scrapeSessions,
      );
      console.log(`runningScrapersCount: ${runningScrapersCount}`);

      const justStartedOrSomeScrapersHaveDied = runningScrapersCount < concurrencyCount;
      console.log(`justStartedOrSomeScrapersHaveDied: ${justStartedOrSomeScrapersHaveDied}`);
      if (!justStartedOrSomeScrapersHaveDied) {
        await this.utils.wait(5000);
        continue;
      }

      const scrapersToLaunchCount = concurrencyCount - runningScrapersCount;
      console.log(`scrapersToLaunchCount: ${scrapersToLaunchCount}`);
      await this.launchAnaliticsScrapers(scrapeWorflow, scrapersToLaunchCount, suggestionsScrapeId);
      await this.utils.wait(5000);
    }
  }

  async hasKeywSuggestionsWithoutAnalitics(suggestionsScrapeId: string): Promise<boolean> {
    const keyword = await this.keywordsRepo
      .createQueryBuilder('keyword')
      .innerJoinAndSelect('keyword.scrapeSessions', 'scrapeSessions', 'scrapeSessions.id = :scrapeId', {
        scrapeId: suggestionsScrapeId,
      })
      .where('keyword.searchVolume is null')
      .andWhere('keyword.searchDifficulty is null')
      .andWhere('keyword.error is null')
      .andWhere('keyword.inProcess = false')
      .getOne();

    return Boolean(keyword);
  }

  private async getRunningAnaliticsScrapersCount(
    scrapeSessions: ScrapeSession[],
  ): Promise<{
    runningScrapersCount: number;
    stuckScraperIds: string[];
  }> {
    const analiticsScrapers = scrapeSessions.filter(scrapeSession => scrapeSession.path === ANALTICS_SCRAPER_PATH);
    const runningAnaliticsScrapers = analiticsScrapers.filter(scrapeSession => !scrapeSession.error);
    const runningAnaliticsScrapersSet = new Set(runningAnaliticsScrapers);
    const stuckScraperIds: string[] = [];

    for (const [i, analiticsScraper] of runningAnaliticsScrapers.entries()) {
      const isScraperStuck = await this.isScraperStuck(analiticsScraper.id);
      console.log(`scraper with the if id: ${isScraperStuck} is stuck: ${isScraperStuck}`);
      if (!isScraperStuck) continue;

      runningAnaliticsScrapersSet.delete(analiticsScraper);
      stuckScraperIds.push(analiticsScraper.id);

      console.log(`running scraper count: ${runningAnaliticsScrapersSet.size} ${i}`);
      console.log('stuckScraperIds:');
      console.log(stuckScraperIds);
    }

    return {
      runningScrapersCount: runningAnaliticsScrapersSet.size,
      stuckScraperIds,
    };
  }

  private async launchAnaliticsScrapers(
    scrapeWorflow: ScrapeWorkflow,
    scrapersToLaunchCount: number,
    suggestionsScrapeId: string,
  ): Promise<ScrapeSession[]> {
    const fullAnaliticsScraperEp = `${SCRAPE_ANALTICS_FOR_MORE_KYWS_EP}/${suggestionsScrapeId}`;
    let launchedScrapersCount = 0;
    let hasLaunchedEnoughScrapers = false;
    const launchedAnaliticsScrapers: ScrapeSession[] = [];
    console.log(
      `launching analitics scrapers, scrapeWorflow: ${scrapeWorflow.id}, scrapersToLaunchCount: ${scrapersToLaunchCount}, suggestionsScrapeId: ${suggestionsScrapeId}`,
    );

    while (!hasLaunchedEnoughScrapers) {
      // tslint:disable-next-line: prefer-const no-var-keyword await-promise
      var analiticsScrapeId: string = await rp.get(fullAnaliticsScraperEp);
      console.log(`launched analtics scrapers id: ${analiticsScrapeId}`);

      const scraper = await this.waitAndFindScraperInDb(analiticsScrapeId);
      console.log(`scraper instanceof ScrapeSession: ${scraper instanceof ScrapeSession}`);
      if (!(scraper instanceof ScrapeSession)) continue;

      scrapeWorflow.scrapeSessions.push(scraper);
      await this.scrapeWorkflowRepo.save(scrapeWorflow);

      launchedAnaliticsScrapers.push(scraper);
      launchedScrapersCount++;
      console.log(`launchedScrapersCount: ${launchedScrapersCount}`);
      hasLaunchedEnoughScrapers = launchedScrapersCount >= scrapersToLaunchCount;
      console.log(`hasLaunchedEnoughScrapers: ${hasLaunchedEnoughScrapers}`);
    }

    console.log(`launched all analtics scrapers needed, count: ${launchedAnaliticsScrapers.length}`);
    return launchedAnaliticsScrapers;
  }

  private async waitAndFindScraperInDb(scrapeSessionId: string): Promise<ScrapeSession | boolean> {
    console.log('finding scraper in db');
    let scraperCanNotBeFoundInDb = false;
    let i = 0;

    while (!scraperCanNotBeFoundInDb) {
      const scraper = await this.scrapeSessionRepo.findOne({ id: scrapeSessionId });
      console.log(`has found scraper in db: ${Boolean(scraper)}`);
      if (scraper) return scraper;

      i++;
      scraperCanNotBeFoundInDb = i < 5 ? false : true;
      console.log(`still no analitics scraper in db, scraperCanNotBeFoundInDb: ${scraperCanNotBeFoundInDb}`);
      await this.utils.wait(2000);
    }

    return false;
  }

  async isScraperStuck(analiticsSessionId: string): Promise<boolean> {
    const now = new Date();
    const fiveMintues = 1000 * 60 * 5 + 1000 * 60 * 60;
    const fiveMinutesBefore = new Date(now.getTime() - fiveMintues);

    const { keywords, createdAt } = await this.scrapeSessionRepo.findOne({
      relations: ['keywords'],
      where: {
        id: analiticsSessionId,
      },
    });

    const hasNotScrapedAnyKeywordsSoFar = keywords.length === 0;
    if (hasNotScrapedAnyKeywordsSoFar) {
      const isScraperStuck = createdAt < fiveMinutesBefore;
      return isScraperStuck;
    }

    const keywordsOfScraperFromLatestToOldest = keywords.sort((a, b) => {
      return b.updateAt.getTime() - a.updateAt.getTime();
    });

    const newestKeyword = keywordsOfScraperFromLatestToOldest[0];

    const isScraperStuck = newestKeyword.updateAt < fiveMinutesBefore;
    return isScraperStuck;
  }
}
