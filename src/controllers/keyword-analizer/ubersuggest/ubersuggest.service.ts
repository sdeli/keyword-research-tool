import { UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';

import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';

import { UBERSUGGEST_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';
import { UtilsService } from '@shared/utils';

@Injectable()
export class UbersuggestService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConfig: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
  ) {}

  async getAnaliticsForOne(keyword: string) {
    console.log('getting analitcs for: ' + keyword);
    const { researchKeywordInput } = this.config.selectors;
    let hasLoadedCorrectData = false;
    let tryCounter = 0;

    const antiCaptchaPage = await this.getAntiCaptchaPageOnUbersuggest();
    let pageOnUbersuggest = antiCaptchaPage.page;
    pageOnUbersuggest = await this.getScrapablePage(pageOnUbersuggest);

    do {
      await this.searchForKeywordOnPage(pageOnUbersuggest, keyword);
      // researchKywInputsValue if equals to the actual keyword then it indicates that the search has happened
      // to the correct keyword and no to an other one... the page tricks with other keywords sometimes
      const researchKywInputsValue = await this.puppeteerUtils.getInputFieldsValue(
        pageOnUbersuggest,
        researchKeywordInput,
      );

      console.log('data load was succesful ' + (researchKywInputsValue === keyword));
      if (researchKywInputsValue === keyword) hasLoadedCorrectData = true;
      else {
        tryCounter++;
      }
    } while (!hasLoadedCorrectData && tryCounter < 4);

    await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest, 'searched');

    await this.triggerKeywCsvDownload(pageOnUbersuggest);
    console.log(11);
  }

  private async getAntiCaptchaPageOnUbersuggest(): Promise<{ browser: Browser; page: Page }> {
    const { url, headless } = this.config;
    const { browser, page } = await this.puppeteerUtils.getAntiCaptchaBrowser({
      headless,
      userDataDir: `${process.cwd()}/src/assets/user-data`,
      downloadPath: `${process.cwd()}/keyword-research-tool/src/assets`,
    });

    await page.goto(url);

    return {
      browser,
      page,
    };
  }

  private async getScrapablePage(pageOnUbersuggest: Page): Promise<Page> {
    console.log('getting scrapable page');

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

    return pageOnUbersuggest;
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

  private triggerKeywCsvDownload(page: Page): Promise<void> {
    console.log('csv download');
    return page.evaluate(() => {
      const buttonNodeList = document.querySelectorAll('button');
      const buttonNodesArr = [].slice.call(buttonNodeList);
      const exportToCsvButtons = buttonNodesArr.filter(button => {
        console.log(button.innerText);
        return button.innerText === 'EXPORT TO CSV';
      });

      exportToCsvButtons[0].click();
    });
  }
}
