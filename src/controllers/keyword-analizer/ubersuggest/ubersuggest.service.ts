import { UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';

import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';

import puppeteerExtra from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha-2';
// tslint:disable-next-line:no-var-requires
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

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
    const antiCaptchaPage = await this.getAntiCaptchaPageOnUbersuggest();
    let pageOnUbersuggest = antiCaptchaPage.page;
    // const { browser } = antiCaptchaPage;

    pageOnUbersuggest = await this.getScrapablePage(pageOnUbersuggest);

    await this.searchForKeywordOnPage(pageOnUbersuggest, keyword);
    await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest);

    // await pageOnUbersuggest.waitFor(5000);
    await this.triggerKeywCsvDownload(pageOnUbersuggest);
    console.log(11);
    // browser.close();
  }

  private async getAntiCaptchaPageOnUbersuggest(): Promise<{ browser: Browser; page: Page }> {
    const { url, headless } = this.config;
    const { captcha2dToken, captcha2dId } = this.globalConfig;

    puppeteerExtra.use(StealthPlugin());
    puppeteerExtra.use(
      RecaptchaPlugin({
        provider: {
          id: captcha2dId,
          token: captcha2dToken,
        },
        visualFeedback: true,
      }),
    );

    const pupeteerExtraOpts = {
      headless,
      slowMo: 10,
      userDataDir: '/home/sandor/Projects/keyword-research-tool/src/assets/user-data',
      executablePath: '/usr/bin/google-chrome-stable',
    };

    const browser = await puppeteerExtra.launch(pupeteerExtraOpts);
    const page = await browser.newPage();

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: '/home/sandor/Projects/keyword-research-tool/src/assets',
    });

    await page.goto(url);

    return {
      browser,
      page,
    };
  }

  private async getScrapablePage(pageOnUbersuggest: Page): Promise<Page> {
    console.log('getting scrapable page');
    const { loggedInImgSel } = this.config.selectors;
    const isLoggedInElem = await pageOnUbersuggest.$(loggedInImgSel);

    console.log('is logged in: ' + Boolean(isLoggedInElem));
    if (!isLoggedInElem) {
      const couldLogIn = await this.tryToLogIn(pageOnUbersuggest);
      if (!couldLogIn) throw Error('could not log into ubersuggest');
    }

    await pageOnUbersuggest.waitFor(3000);

    const hasCaptchaOnPage = await this.puppeteerUtils.hasCaptchasOnPage(pageOnUbersuggest);
    console.log('has captcha on page' + hasCaptchaOnPage);
    if (hasCaptchaOnPage) {
      await this.puppeteerUtils.solveCaptchas(pageOnUbersuggest);
    }

    return pageOnUbersuggest;
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
    const { researchKeywordInput, keywordResearchResAppearedSel } = this.config.selectors;
    await this.puppeteerUtils.clearInputFieldAndType(pageOnUbersuggest, researchKeywordInput, keyword);
    await this.utils.waitBetween(200, 1000);
    await this.clickStartKeywordResearchBtn(pageOnUbersuggest);
    await pageOnUbersuggest.waitForSelector(keywordResearchResAppearedSel);
  }

  private async clickStartKeywordResearchBtn(pageOnUbersuggest: Page) {
    console.log('clickint start btn');
    this.puppeteerUtils.makeScreenshot(pageOnUbersuggest);
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
