import { UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
import * as puppeteer from 'puppeteer';
import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';

import { UBERSUGGEST_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { PuppeteerUtilsService } from '@utils/puppeteer-utils/pupeteer-utils.service';

@Injectable()
export class UbersuggestService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
  ) {}

  async getAnaliticsForOne(/*keyword: string*/) {
    const { /*browser,*/ page: pageOnUbersuggest } = await this.getPageOnUbersuggest();
    await pageOnUbersuggest.screenshot({
      path: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/ubersugg1.png',
    });
  }

  async getPageOnUbersuggest(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const { url, headless } = this.config;

    const browser: Browser = await puppeteer.launch({
      headless,
      args: ['--profile-directory="/Users/sandordeli/Documents"', '--no-sandbox'],
      userDataDir: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/ubersuggest/user-data',
    });

    let page: Page = await browser.newPage();
    // page = await this.killUbersuggestCaptcha(page);
    page = await this.puppeteerUtils.preparePageForDetection(page);
    await page.goto(url);
    // const isDetectableObj = await this.puppeteerUtils.isPageDetectable(page);
    // console.log(isDetectableObj);
    return {
      browser,
      page,
    };
  }

  async killUbersuggestCaptcha(page: Page) {
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      console.log(interceptedRequest.url());
      const requestCausesCaptcha = interceptedRequest.url().includes('captcha');
      if (requestCausesCaptcha) {
        console.log(interceptedRequest.url());
        interceptedRequest.abort();
      } else {
        interceptedRequest.continue();
      }
    });

    return page;
  }
}
