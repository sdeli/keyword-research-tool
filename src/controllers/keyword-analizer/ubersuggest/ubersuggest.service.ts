import { SaveScrapeSessionParamsI, UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
// @ts-ignore
import { csv } from 'csvtojson';
import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';

import { UBERSUGGEST_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';
import { UtilsService } from '@shared/utils';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UbersuggestService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConfig: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
    @InjectRepository(Keyword) private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(ScrapeSession) private readonly scrapeSessionRepo: Repository<ScrapeSession>,
  ) {}

  async updateAnaliticsScrapeSessionWithError(analiticsScrapeSessionId: string, error: Error) {
    const scrapeSession = await this.scrapeSessionRepo.findOne({ id: analiticsScrapeSessionId });
    scrapeSession.error = error;
    return this.scrapeSessionRepo.save(scrapeSession);
    // return this.scrapeSessionRepo.update({ error: error as any, isSuccesful: false }, { id: analiticsScrapeSessionId });
  }

  async scrapeAnaliticsForOneAndSaveInDb(scrapeSessionId: string, keyword: string) {
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

      const { browser, pageOnUbersuggest } = await this.getScrapablePage();
      console.log('got scrapeable page');

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
    } catch (e) {
      console.error(e);
      scrapeSession.error = e;
      await this.scrapeSessionRepo.save(scrapeSession);
      console.log('scrape session updated to error');
    }
  }

  async scrapeAnaliticsForMoreKywsAndUpdateDb(analiticsScrapeSessionId: string, suggestionsScrapeId: string) {
    console.log(`start to scrapeAnaliticsForMoreKywsAndUpdateDb: ${analiticsScrapeSessionId} ${suggestionsScrapeId}`);
    const saveScrapeSessionParams: SaveScrapeSessionParamsI = {
      scrapeSessionId: analiticsScrapeSessionId,
      path: 'analitics/session/:session',
    };
    const scrapeSession = await this.utils.saveScrapeSession(saveScrapeSessionParams);

    const hasKeywordsInDbWithoutAnalitics = true;
    let browser: Browser;
    let pageOnUbersuggest: Page;
    let keyword: string;
    let downloadedKeywordsFilePath: string;

    while (hasKeywordsInDbWithoutAnalitics) {
      try {
        const keywordEntity = await this.getKeywordSuggestion(suggestionsScrapeId);
        if (!keywordEntity) {
          console.log('there are no more keywords without analitics in this suggestion scrape session');
          break;
        } else keyword = keywordEntity.keyword;
      } catch (e) {
        console.log('err in try catch 1');
        console.error(e);
        break;
      }

      try {
        console.log(`current keyword to get analitics for: ${keyword}`);

        const hasJustStartedScraping = !pageOnUbersuggest;
        if (hasJustStartedScraping) {
          const pageObj = await this.getScrapablePage();
          console.log('got anti captcha page');
          browser = pageObj.browser;
          pageOnUbersuggest = pageObj.pageOnUbersuggest;
        } else {
          await this.makePageScrapableIfNot(pageOnUbersuggest);
          console.log('page is (or made to be) scrapable');
        }

        await this.searchForKeywordOnPageUntilItShowsCorrectData(pageOnUbersuggest, keyword);
        console.log('keyword analitics could be loaded into page');

        const { err, fileToDownloadPath } = await this.downloadKeywAnaliticsCsv(pageOnUbersuggest, keyword);
        if (err) {
          await this.updateKeywordToErr(err, keyword, suggestionsScrapeId);
          console.log(`keyword: ${keyword} updated to include err`);
          continue;
        }

        downloadedKeywordsFilePath = fileToDownloadPath;
      } catch (err) {
        console.log('err in try catch 2');
        console.error(err);
        await this.updateKeywordToErr(err, keyword, suggestionsScrapeId);
        console.log(`keyword: ${keyword} updated to include err`);

        const hasRunningBrowser = browser?.close;
        if (hasRunningBrowser) await browser.close();
        pageOnUbersuggest = null;

        console.log('due to error browser closed');
        continue;
      }

      try {
        await this.saveAnaliticsIntoDbFromCsv(downloadedKeywordsFilePath, scrapeSession);
        console.log('keyword analitics data saved into db');

        this.utils.deleteFileSync(downloadedKeywordsFilePath);
        console.log(`${downloadedKeywordsFilePath} => is deleted`);
      } catch (e) {
        console.log('err in try catch 3');
        console.log(e);
      }
    }

    const hasRunningBrowser = browser?.close;
    if (hasRunningBrowser) await browser.close();
    console.log('browser closed');

    scrapeSession.isSuccesful = true;
    await this.scrapeSessionRepo.save(scrapeSession);
    console.log('scrape session updated to successfull, scrape finished');
  }

  private async getAntiCaptchaPageOnUbersuggest(): Promise<{ browser: Browser; page: Page }> {
    const { url, headless } = this.config;
    const { downloadsFolder, userDataFolder } = this.globalConfig;

    const { browser, page } = await this.puppeteerUtils.getAntiCaptchaBrowser({
      headless,
      userDataDir: userDataFolder,
      downloadPath: downloadsFolder,
    });

    await page.goto(url);

    return {
      browser,
      page,
    };
  }

  private async getScrapablePage(): Promise<{ browser: Browser; pageOnUbersuggest: Page }> {
    console.log('getting scrapable page');

    const antiCaptchaPage = await this.getAntiCaptchaPageOnUbersuggest();
    const pageOnUbersuggest = antiCaptchaPage.page;
    const { browser } = antiCaptchaPage;
    console.log('got anti captcha page');

    const isLoggedIn = await this.isLoggedInToUbersuggest(pageOnUbersuggest);
    console.log('is logged in: ' + isLoggedIn);
    if (!isLoggedIn) {
      const couldLogIn = await this.tryToLogIn(pageOnUbersuggest);
      if (!couldLogIn) throw new Error('could not log into ubersuggest');
    }

    await pageOnUbersuggest.waitFor(2000);

    const hasCaptchaOnPage = await this.puppeteerUtils.hasCaptchasOnPage(pageOnUbersuggest);
    console.log('has captcha on page ' + hasCaptchaOnPage);
    if (hasCaptchaOnPage) {
      await this.puppeteerUtils.solveCaptchas(pageOnUbersuggest);
      await this.utils.wait(3000);
    }

    return {
      browser,
      pageOnUbersuggest,
    };
  }

  private async isLoggedInToUbersuggest(pageOnUbersuggest: Page): Promise<boolean> {
    const { loggedInImgSel, loginWithGoogleBtnSel } = this.config.selectors;

    const loggedInImageElemHandle = await pageOnUbersuggest.$(loggedInImgSel);
    const loginWithGoogleElemHandle = await pageOnUbersuggest.$(loginWithGoogleBtnSel);

    return loggedInImageElemHandle && !loginWithGoogleElemHandle;
  }

  private async tryToLogIn(pageOnUbersuggest): Promise<boolean> {
    const { loginWithGoogleBtnSel, loggedInImgSel } = this.config.selectors;
    let loginTriesCounter = 0;
    let successfullyLoggedIn = false;

    do {
      console.log('try to log in ' + loginTriesCounter);
      console.log(successfullyLoggedIn);
      try {
        await pageOnUbersuggest.click(loginWithGoogleBtnSel);
        await pageOnUbersuggest.waitForSelector(loggedInImgSel, { timeout: 2000 });
        successfullyLoggedIn = true;
      } catch (e) {
        loginTriesCounter++;
      }
    } while (!successfullyLoggedIn && loginTriesCounter < 10);

    console.log('logged in');
    return successfullyLoggedIn;
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
    await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest, 'typed');
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

      console.log('input fields value is correctly set ' + (researchKywInputsValue === keyword));
      if (researchKywInputsValue !== keyword) {
        await this.puppeteerUtils.tryClearInputFieldAndType(pageOnUbersuggest, researchKeywordInput, keyword);
      }
    }

    do {
      const researchKywInputsValue = await this.puppeteerUtils.getInputFieldsValue(
        pageOnUbersuggest,
        researchKeywordInput,
      );

      console.log('input fields value is correctly set ' + (researchKywInputsValue === keyword));
      if (researchKywInputsValue === keyword) succesFullyWroteIntoInputField = true;
      else {
        tryCounter++;
        succesFullyWroteIntoInputField = false;
        await this.utils.waitBetween(1500, 2000);
        await this.puppeteerUtils.tryClearInputFieldAndType(pageOnUbersuggest, researchKeywordInput, keyword);
      }
    } while (!succesFullyWroteIntoInputField && tryCounter < 15);

    if (!succesFullyWroteIntoInputField) throw new Error('couldnt write into input field');
    // else console.log('succesfully wrote keyword into input field');
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

    matchingKywEntity.error = err;
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
      .getOne();

    keyword.inProcess = true;
    await this.keywordRepo.save(keyword);
    return keyword;
  }

  private async makePageScrapableIfNot(pageOnUbersuggest: Page) {
    const hasAllSelectorsOnPage = await this.hasAllSelectorsOnPage(pageOnUbersuggest);
    if (!hasAllSelectorsOnPage) throw new Error('page is broken or not the page we want to scrape');

    const isLoggedIn = await this.isLoggedInToUbersuggest(pageOnUbersuggest);
    console.log('is logged in: ' + isLoggedIn);
    if (!isLoggedIn) {
      const couldLogIn = await this.tryToLogIn(pageOnUbersuggest);
      if (!couldLogIn) throw new Error('could not log into ubersuggest');
      await pageOnUbersuggest.waitFor(2000);
    }

    const hasCaptchaOnPage = await this.puppeteerUtils.hasCaptchasOnPage(pageOnUbersuggest);
    console.log('has captcha on page ' + hasCaptchaOnPage);
    if (hasCaptchaOnPage) {
      await this.puppeteerUtils.solveCaptchas(pageOnUbersuggest);
      await this.utils.wait(3000);
    }
  }

  private async hasAllSelectorsOnPage(pageOnUbersuggest) {
    let hasAllSelectorsOnPage = true;
    const {
      keywordResearchResAppearedSel,
      loggedInImgSel,
      loginWithGoogleBtnSel,
      researchKeywordInput,
    } = this.config.selectors;

    const hasKeywordResearchBoxOnPage = (await pageOnUbersuggest.$(researchKeywordInput)) !== null;
    if (!hasKeywordResearchBoxOnPage) {
      hasAllSelectorsOnPage = false;
      console.log(`doenst have selector: ${keywordResearchResAppearedSel} on the page`);
    }

    const hasLoggedInBtnOnPage = (await pageOnUbersuggest.$(loggedInImgSel)) !== null;
    const hasLogInBtnOnPage = (await pageOnUbersuggest.$(loginWithGoogleBtnSel)) !== null;
    if (!(hasLoggedInBtnOnPage || hasLogInBtnOnPage)) {
      hasAllSelectorsOnPage = false;
      console.log(`none of the selectors: ${loggedInImgSel} , ${loginWithGoogleBtnSel} are on the page`);
    }

    return hasAllSelectorsOnPage;
  }
}
