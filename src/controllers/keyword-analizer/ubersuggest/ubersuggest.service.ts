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
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UbersuggestService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConfig: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
    @InjectRepository(Keyword) private readonly keywordRepo: Repository<Keyword>,
  ) {}

  async scrapeAnaliticsForOneAndSaveInDb(scrapeSessionId: string, keyword: string) {
    console.log(`getting analitics for: ${keyword}`);
    const saveScrapeSessionParams: SaveScrapeSessionParamsI = {
      scrapeSessionId,
      path: 'keyword/analitics/:keyword',
      keyword,
    };

    try {
      const { browser, pageOnUbersuggest } = await this.getScrapablePage();
      console.log('got scrapeable page');

      await this.searchForKeywordOnPageUntilItShowsCorrectData(pageOnUbersuggest, keyword);
      console.log('page could show data succesfully');

      const downloadedFilePath = await this.downloadKeywAnaliticsCsv(pageOnUbersuggest, keyword);
      console.log(`${downloadedFilePath} => is downloaded`);

      await browser.close();

      await this.saveAnaliticsIntoDbFromCsv(downloadedFilePath);
      console.log('keyword analitics data saved into db');

      this.utils.deleteFileSync(downloadedFilePath);
      console.log(`${downloadedFilePath} => is deleted`);

      await this.utils.saveScrapeSession(saveScrapeSessionParams);
      console.log('scrape session saved');
    } catch (e) {
      console.error(e);
      saveScrapeSessionParams.err = e;
      await this.utils.saveScrapeSession(saveScrapeSessionParams);
      console.log('scrape session saved with error');
    }
  }

  async scrapeAnaliticsForMoreKywsAndUpdateDb(suggestionScrapeSessionId: string, ownScrapeSessionId: string) {
    try {
      let hasKeywordsInDbWithoutAnalitics = true;
      const { browser, pageOnUbersuggest } = await this.getScrapablePage();
      console.log('got anti captcha page');

      while (hasKeywordsInDbWithoutAnalitics) {
        const keyword = await this.getKeywordSuggestion(suggestionScrapeSessionId);
        if (!keyword) hasKeywordsInDbWithoutAnalitics = false;
        await this.searchForKeywordOnPageUntilItShowsCorrectData(pageOnUbersuggest, keyword.keyword);
      }

      await browser.close();
    } catch (e) {
      console.error(e);
    }
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

    console.log('returning ' + successfullyLoggedIn);
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
    if (pageFailedToShowCorrectData) throw new Error('Page didnt load data, that could be downloaded');
  }

  private async searchForKeywordOnPage(pageOnUbersuggest: Page, keyword: string): Promise<void> {
    console.log('searching for keyword');
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
      console.log('for');
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
      console.log('while');
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
    else console.log('while loop has allowed to click on kyw research btn');
  }

  private async clickStartKeywordResearchBtn(pageOnUbersuggest: Page) {
    console.log('clickint start btn');
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

  private async downloadKeywAnaliticsCsv(page: Page, keyword: string): Promise<string> {
    console.log('csv download');
    const { downloadsFolder } = this.globalConfig;
    const downloadsFileName = `ubersuggest_${keyword}.csv`.replace(' ', '_');

    const waitForFileDownloadPromise = this.utils.waitToDownloadFile(downloadsFolder, downloadsFileName);
    const clickDownloadBtnPromise = page.evaluate(() => {
      const buttonNodeList = document.querySelectorAll('button');
      const buttonNodesArr = [].slice.call(buttonNodeList);
      const exportToCsvButtons = buttonNodesArr.filter(button => {
        console.log(button.innerText);
        return button.innerText === 'EXPORT TO CSV';
      });

      exportToCsvButtons[0].click();
    });

    console.log('waiting for download & download starts');
    await Promise.all([waitForFileDownloadPromise, clickDownloadBtnPromise]);
    console.log(`${downloadsFileName} has been downloadeed`);

    const downloadedFilePath = `${downloadsFolder}/${downloadsFileName}`;
    return downloadedFilePath;
  }

  private async saveAnaliticsIntoDbFromCsv(downloadedFilePath: string) {
    const kywAnaliticses: any[] = await csv().fromFile(downloadedFilePath);
    const { keywordsToUpdateInDb, keywordsToSaveIntoDb } = await this.separateKeywordsInAnalitics(kywAnaliticses);

    console.log('new keywords from ubersuggest:');
    console.log(keywordsToSaveIntoDb);

    await this.createNewKywEntitiesAndSave(keywordsToSaveIntoDb);
    await this.updateKywEntities(keywordsToUpdateInDb, kywAnaliticses);
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

  private async createNewKywEntitiesAndSave(kywAnalitics: any[]): Promise<void> {
    const keywords = kywAnalitics.map(analiticsObj => {
      const keyword = new Keyword();

      keyword.keyword = analiticsObj['Keyword'] ? analiticsObj['Keyword'] : null;
      keyword.searchVolume = analiticsObj['Search Volume'] ? parseInt(analiticsObj['Search Volume'], 10) : null;
      keyword.searchDifficulty = analiticsObj['Search Difficulty']
        ? parseInt(analiticsObj['Search Difficulty'], 10)
        : null;
      keyword.payedDifficulty = analiticsObj['Paid Difficulty'] ? parseInt(analiticsObj['Paid Difficulty'], 10) : null;

      return keyword;
    });

    await this.keywordRepo.save(keywords);
  }

  private async updateKywEntities(keywordsToUpdateInDb: Keyword[], kywAnaliticses: any[]) {
    const updatedKeywords = keywordsToUpdateInDb.map(currKeyword => {
      const matchingKywAnalitics = kywAnaliticses.find(currKywAnalitics => {
        return currKeyword.keyword === currKywAnalitics['Keyword'];
      });

      currKeyword.keyword = matchingKywAnalitics['Keyword'] ? matchingKywAnalitics['Keyword'] : null;
      currKeyword.searchVolume = matchingKywAnalitics['Search Volume']
        ? parseInt(matchingKywAnalitics['Search Volume'], 10)
        : null;
      currKeyword.searchDifficulty = matchingKywAnalitics['Search Difficulty']
        ? parseInt(matchingKywAnalitics['Search Difficulty'], 10)
        : null;
      currKeyword.payedDifficulty = matchingKywAnalitics['Paid Difficulty']
        ? parseInt(matchingKywAnalitics['Paid Difficulty'], 10)
        : null;

      return currKeyword;
    });

    await this.keywordRepo.save(updatedKeywords);
  }

  private getKeywordSuggestion(suggestionScrapeId: string) {
    return this.keywordRepo.findOne({
      where: {
        payedDifficulty: null,
        searchDifficulty: null,
        searchVolume: null,
        id: suggestionScrapeId,
      },
    });
  }
}
