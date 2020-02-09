import { SaveScrapeSessionParamsI, UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
// @ts-ignore
import { csv } from 'csvtojson';
import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';

import { UBERSUGGEST_CONFIG_TOKEN, supportedLanguages } from '@keyword-analizer/keyword-analizer.types';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';
import { UtilsService } from '@shared/utils';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { Repository } from 'typeorm';
import { MakePageScrapableIfNotService } from './make-page-scrapable-if-not/make-page-scrapable-if-not.service';
import { UbersuggestAnaliticsParams } from '@shared/process-queue/process-queue.types';

@Injectable()
export class UbersuggestService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConfig: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
    private readonly makePageScrapableIfNot: MakePageScrapableIfNotService,
    @InjectRepository(Keyword) private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>,
  ) {}

  async updateAnaliticsScrapeSessionWithError(scrapeSessionId: string, error: Error) {
    return this.utils.updateScrapeSessionWithError(scrapeSessionId, error);
  }

  async scrapeAnaliticsForOneAndSaveInDb(scrapeSessionId: string, keyword: string, lang: supportedLanguages) {
    console.log(`getting analitics for: ${keyword}`);
    const saveScrapeSessionParams: SaveScrapeSessionParamsI = {
      scrapeSessionId,
      path: 'keyword/analitics/:keyword',
      keyword,
    };

    let scrapeSession: ScrapeSession;
    let downloadedKeywordsFilePath: string;

    try {
      scrapeSession = await this.utils.saveScrapeSession(saveScrapeSessionParams);
      console.log('scrape session saved');

      // tslint:disable-next-line: prefer-const no-var-keyword
      var { browser, page: pageOnUbersuggest } = await this.getAntiCaptchaPageOnUbersuggest(lang);
      console.log('got scrapeable page');

      await this.makePageScrapableIfNot.do(pageOnUbersuggest, scrapeSessionId, lang);

      await this.searchForKeywordOnPageUntilItShowsCorrectData(pageOnUbersuggest, keyword);
      console.log('page could show data succesfully');

      const { err, fileToDownloadPath } = await this.downloadKeywAnaliticsCsv(pageOnUbersuggest, keyword);
      if (err) throw new Error(err);

      downloadedKeywordsFilePath = fileToDownloadPath;
      console.log(`${downloadedKeywordsFilePath} => is downloaded`);
      await browser.close();

      await this.saveAnaliticsIntoDbFromCsv(downloadedKeywordsFilePath, scrapeSession);
      console.log('keyword analitics data saved into db');

      this.utils.deleteFileSync(downloadedKeywordsFilePath);
      console.log(`${downloadedKeywordsFilePath} => is deleted`);

      scrapeSession.isSuccesful = true;
      await this.scrapeSessionRepo.save(scrapeSession);
      console.log('scrape session updated to successful');
    } catch (err) {
      console.error(err);
      await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest, scrapeSessionId);
      await this.utils.updateScrapeSessionWithError(scrapeSession.id, err);
      console.log('scrape session updated to error');
    }
  }

  async scrapeAnaliticsForMoreKywsAndUpdateDb(params: UbersuggestAnaliticsParams) {
    const { analiticsScrapeSessionId, suggestionsScrapeId, lang } = params;
    console.log(`start to scrapeAnaliticsForMoreKywsAndUpdateDb: ${analiticsScrapeSessionId} ${suggestionsScrapeId}`);

    const saveScrapeSessionParams: SaveScrapeSessionParamsI = {
      scrapeSessionId: analiticsScrapeSessionId,
      path: 'analitics/more',
    };
    const scrapeSession = await this.utils.saveScrapeSession(saveScrapeSessionParams);

    const hasKeywordsInDbWithoutAnalitics = true;
    let browser: Browser;
    let pageOnUbersuggest: Page;
    let keyword: string;
    let downloadedKeywordsFilePath: string;
    let consecutiveKeywordErrorsCount = 0;

    while (hasKeywordsInDbWithoutAnalitics) {
      try {
        const hasJustStartedScraping = !pageOnUbersuggest;
        if (hasJustStartedScraping) {
          const pageObj = await this.getAntiCaptchaPageOnUbersuggest(lang);
          console.log('got anti captcha page');
          browser = pageObj.browser;
          pageOnUbersuggest = pageObj.page;
        }

        const isPageScrapable = await this.makePageScrapableIfNot.do(pageOnUbersuggest, analiticsScrapeSessionId, lang);
        if (isPageScrapable) console.log('page is (or made to be) scrapable');
        else {
          throw new Error('page is not scrapable, process returns');
        }

        const keywordEntity = await this.getKeywordSuggestion(suggestionsScrapeId);
        if (!keywordEntity) {
          console.log('there are no more keywords without analitics in this suggestion scrape session');
          break;
        }

        keyword = keywordEntity.keyword;
        console.log(`current keyword to get analitics for: ${keyword}`);
      } catch (err) {
        await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest, analiticsScrapeSessionId);
        console.error(`browser error happened`);
        throw new Error(err);
      }

      try {
        await this.searchForKeywordOnPageUntilItShowsCorrectData(pageOnUbersuggest, keyword);
        console.log('keyword analitics could be loaded into page');

        const { err, fileToDownloadPath } = await this.downloadKeywAnaliticsCsv(pageOnUbersuggest, keyword);
        if (err) {
          await this.updateKeywordToErr(err, keyword, suggestionsScrapeId);
          console.log(`keyword: ${keyword} updated to include err`);
          continue;
        }

        downloadedKeywordsFilePath = fileToDownloadPath;
        consecutiveKeywordErrorsCount = 0;
      } catch (err) {
        console.log('err in try catch 2');
        console.error(err);
        await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest, analiticsScrapeSessionId);
        await this.updateKeywordToErr(err, keyword, suggestionsScrapeId);
        console.log(`keyword: ${keyword} updated to include err`);

        consecutiveKeywordErrorsCount++;
        const errorOccursInfinitely = consecutiveKeywordErrorsCount > 3;
        if (errorOccursInfinitely) {
          console.log('due to consecutive keyword errors process closed');
          throw new Error(err);
        }

        continue;
      }

      try {
        await this.saveAnaliticsIntoDbFromCsv(downloadedKeywordsFilePath, scrapeSession);
        console.log('keyword analitics data saved into db');

        this.utils.deleteFileSync(downloadedKeywordsFilePath);
        console.log(`${downloadedKeywordsFilePath} => is deleted`);
      } catch (err) {
        console.log('err in try catch 3');
        console.log(err);

        await this.updateKeywordToErr(err, keyword, suggestionsScrapeId);
        console.log(`keyword: ${keyword} updated to include err`);
      }
    }

    const hasRunningBrowser = browser?.close;
    if (hasRunningBrowser) await browser.close();
    console.log('browser closed');

    scrapeSession.isSuccesful = true;
    await this.scrapeSessionRepo.save(scrapeSession);
    console.log('scrape session updated to successfull, scrape finished');
  }

  private async getAntiCaptchaPageOnUbersuggest(lang: supportedLanguages): Promise<{ browser: Browser; page: Page }> {
    const { urlByLang, headless } = this.config;
    const { downloadsFolder, userDataFolder } = this.globalConfig;

    const { browser, page } = await this.puppeteerUtils.getAntiCaptchaBrowser({
      headless,
      userDataDir: userDataFolder,
      downloadPath: downloadsFolder,
    });

    await this.puppeteerUtils.preparePageForDetection(page);

    await page.goto(urlByLang[lang]);

    return {
      browser,
      page,
    };
  }

  private async searchForKeywordOnPageUntilItShowsCorrectData(pageOnUbersuggest: Page, keyword: string) {
    const { researchKeywordInput } = this.config.selectors;
    let hasPageShownCorrectData = false;
    let tryCounter = 0;

    do {
      await this.searchForKeywordOnPage(pageOnUbersuggest, keyword);
      // researchKywInputsValue if equals to the actual keyword then it indicates that the search has happened
      // to the correct keyword and no to an other one... the page tricks with other keywords sometimes
      const researchKywInputsValue = await this.puppeteerUtils.getInputFieldsValue(
        pageOnUbersuggest,
        researchKeywordInput,
      );

      console.log('data load was succesful ' + (researchKywInputsValue === keyword));
      if (researchKywInputsValue === keyword) hasPageShownCorrectData = true;
      else {
        tryCounter++;
      }
    } while (!hasPageShownCorrectData && tryCounter < 4);

    const pageFailedToShowCorrectData = !hasPageShownCorrectData && tryCounter > 4;
    if (pageFailedToShowCorrectData) throw new Error('Page didnt load keyword analitics data');
  }

  private async searchForKeywordOnPage(pageOnUbersuggest: Page, keyword: string): Promise<void> {
    console.log(`searching for keyword: ${keyword}`);
    const { keywordResearchResAppearedSel } = this.config.selectors;
    await this.setKeywResearchInputsValue(pageOnUbersuggest, keyword);
    await this.utils.waitBetween(900, 1500);
    await this.clickStartKeywordResearchBtn(pageOnUbersuggest);
    await pageOnUbersuggest.waitForSelector(keywordResearchResAppearedSel);
  }

  private async setKeywResearchInputsValue(pageOnUbersuggest: Page, keyword: string): Promise<void> {
    const { researchKeywordInput } = this.config.selectors;
    let succesFullyWroteIntoInputField = false;
    let tryCounter = 0;

    // I know this for loop and then the while one are ugly like fuck... but they have made the job done.
    for (let i = 0; i < 3; i++) {
      const researchKywInputsValue = await this.puppeteerUtils.getInputFieldsValue(
        pageOnUbersuggest,
        researchKeywordInput,
      );

      // console.log('input fields value is correctly set ' + (researchKywInputsValue === keyword));
      if (researchKywInputsValue !== keyword) {
        await this.puppeteerUtils.tryClearInputFieldAndType(pageOnUbersuggest, researchKeywordInput, keyword);
      }
    }

    do {
      const researchKywInputsValue = await this.puppeteerUtils.getInputFieldsValue(
        pageOnUbersuggest,
        researchKeywordInput,
      );

      // console.log('input fields value is correctly set ' + (researchKywInputsValue === keyword));
      if (researchKywInputsValue === keyword) succesFullyWroteIntoInputField = true;
      else {
        tryCounter++;
        succesFullyWroteIntoInputField = false;
        await this.utils.waitBetween(1500, 2000);
        await this.puppeteerUtils.tryClearInputFieldAndType(pageOnUbersuggest, researchKeywordInput, keyword);
      }
    } while (!succesFullyWroteIntoInputField && tryCounter < 15);

    if (!succesFullyWroteIntoInputField) throw new Error('couldnt write into input field');
    else console.log('succesfully wrote keyword into input field');
  }

  private async clickStartKeywordResearchBtn(pageOnUbersuggest: Page) {
    const allButtonHandles = await pageOnUbersuggest.$$('button');
    let startKeywordResBtn;

    for (const buttonHandle of allButtonHandles) {
      const isStartKeywordResBtn = await buttonHandle.$$eval('[fill="currentColor"]', svgs => svgs.length > 0);
      if (isStartKeywordResBtn) {
        startKeywordResBtn = buttonHandle;
        break;
      }
    }

    await startKeywordResBtn.click();
  }

  private async downloadKeywAnaliticsCsv(
    page: Page,
    keyword: string,
  ): Promise<{
    err: string;
    fileToDownloadPath: string;
  }> {
    console.log('csv download');
    const { downloadsFolder } = this.globalConfig;
    const downloadsFileName = `ubersuggest_${keyword}.csv`.replace(/\s/g, '_');
    const fileToDownloadPath = `${downloadsFolder}/${downloadsFileName}`;

    console.log('clicking download btn');
    await page.evaluate(() => {
      const buttonNodeList = document.querySelectorAll('button');
      const buttonNodesArr = [].slice.call(buttonNodeList);
      const exportToCsvButtons = buttonNodesArr.filter(button => {
        console.log(button.innerText);
        return button.innerText === 'EXPORT TO CSV';
      });

      exportToCsvButtons[0].click();
    });

    console.log('waiting for download file');
    const couldFileBeDownloaded = await this.utils.waitToDownloadFileByPoll(fileToDownloadPath);

    console.log(`could file be downloaded: ${couldFileBeDownloaded}`);
    return {
      err: couldFileBeDownloaded ? null : 'file could not be downloaded',
      fileToDownloadPath: couldFileBeDownloaded ? fileToDownloadPath : null,
    };
  }

  async updateKeywordToErr(err: any, keyword: string, suggestionsScrapeId: string) {
    // const kywRelations = Keyword.getRelationNames();
    const sugestionsScrapeSession = await this.scrapeSessionRepo.findOne({
      where: [{ id: suggestionsScrapeId }],
    });

    const matchingKywEntity = await this.keywordRepo.findOne({
      relations: ['scrapeSessions'],
      where: [
        {
          keyword,
          scrapeSession: [sugestionsScrapeSession],
        },
      ],
    });

    matchingKywEntity.error = this.utils.createStringifyableError(err);
    await this.keywordRepo.save(matchingKywEntity);
  }

  private async saveAnaliticsIntoDbFromCsv(downloadedFilePath: string, scrapeSession: ScrapeSession) {
    const kywAnaliticses: any[] = await csv().fromFile(downloadedFilePath);
    const { keywordsToUpdateInDb, keywordsToSaveIntoDb } = await this.separateKeywordsInAnalitics(kywAnaliticses);

    await this.createNewKywEntitiesAndSave(keywordsToSaveIntoDb, scrapeSession);
    await this.updateKywEntities(keywordsToUpdateInDb, kywAnaliticses, scrapeSession);
  }

  private async separateKeywordsInAnalitics(
    kywAnaliticses: any[],
  ): Promise<{
    keywordsToUpdateInDb: any[];
    keywordsToSaveIntoDb: any[];
  }> {
    const whereConditons = kywAnaliticses.reduce((acc, currKeywordAnalitics) => {
      if (currKeywordAnalitics.hasOwnProperty('Keyword')) {
        const keyword = currKeywordAnalitics['Keyword'];
        return [...acc, { keyword }];
      } else {
        return acc;
      }
    }, []);

    const keywordsHaveAlreadyInDb = await this.keywordRepo.find({
      where: whereConditons,
    });

    const keywordsMissingFromDb = kywAnaliticses.reduce((acc, currKeywordAnalitics) => {
      const keyword = currKeywordAnalitics.hasOwnProperty('Keyword');
      if (!keyword) return acc;

      const isKeywordMissingFromDb = !keywordsHaveAlreadyInDb.find(keyword => {
        return keyword.keyword === currKeywordAnalitics['Keyword'];
      });

      if (isKeywordMissingFromDb) return [...acc, currKeywordAnalitics];
      else return acc;
    }, []);

    return {
      keywordsToUpdateInDb: keywordsHaveAlreadyInDb,
      keywordsToSaveIntoDb: keywordsMissingFromDb,
    };
  }

  private async createNewKywEntitiesAndSave(kywAnalitics: any[], scrapeSession: ScrapeSession): Promise<void> {
    const keywords = kywAnalitics.map(analiticsObj => {
      const keyword = new Keyword();

      keyword.keyword = analiticsObj['Keyword'] ? analiticsObj['Keyword'] : null;
      keyword.searchVolume = analiticsObj['Search Volume'] ? parseInt(analiticsObj['Search Volume'], 10) : null;
      keyword.searchDifficulty = analiticsObj['Search Difficulty']
        ? parseInt(analiticsObj['Search Difficulty'], 10)
        : null;
      keyword.payedDifficulty = analiticsObj['Paid Difficulty'] ? parseInt(analiticsObj['Paid Difficulty'], 10) : null;
      keyword.scrapeSessions = [scrapeSession];
      return keyword;
    });

    await this.keywordRepo.save(keywords);
  }

  private async updateKywEntities(
    keywordsToUpdateInDb: Keyword[],
    kywAnaliticses: any[],
    scrapeSession: ScrapeSession,
  ) {
    const updatedKeywords = keywordsToUpdateInDb.map(currKeyword => {
      const matchingKywAnalitics = kywAnaliticses.find(currKywAnalitics => {
        return currKeyword.keyword === currKywAnalitics['Keyword'];
      });

      currKeyword.searchVolume = matchingKywAnalitics['Search Volume']
        ? parseInt(matchingKywAnalitics['Search Volume'], 10)
        : null;
      currKeyword.searchDifficulty = matchingKywAnalitics['Search Difficulty']
        ? parseInt(matchingKywAnalitics['Search Difficulty'], 10)
        : null;
      currKeyword.payedDifficulty = matchingKywAnalitics['Paid Difficulty']
        ? parseInt(matchingKywAnalitics['Paid Difficulty'], 10)
        : null;

      currKeyword.scrapeSessions = [...currKeyword.scrapeSessions, scrapeSession];
      currKeyword.inProcess = false;

      return currKeyword;
    });

    await this.keywordRepo.save(updatedKeywords);
  }

  // keyword suggestions are keywords without analitics
  async getKeywordSuggestion(suggestionScrapeId: string): Promise<Keyword> {
    const keyword = await this.keywordRepo
      .createQueryBuilder('keyword')
      .innerJoinAndSelect('keyword.scrapeSessions', 'scrapeSessions', 'scrapeSessions.id = :scrapeId', {
        scrapeId: suggestionScrapeId,
      })
      .where('keyword.searchVolume is null')
      .andWhere('keyword.searchDifficulty is null')
      .andWhere('keyword.error is null')
      .andWhere('keyword.inProcess = false')
      .skip(0)
      .getOne();

    if (keyword) {
      keyword.inProcess = true;
      await this.keywordRepo.save(keyword);
    }

    return keyword;
  }
}
