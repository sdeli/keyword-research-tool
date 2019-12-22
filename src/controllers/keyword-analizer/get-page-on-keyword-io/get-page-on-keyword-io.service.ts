import { PuppeteerUtilsService } from '@utils/puppeteer-utils/pupeteer-utils.service';
import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import * as Apify from 'apify';
import * as puppeteer from 'puppeteer';
import { KEYWORD_ANALIZER_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { KeywordAnalizerConfigI } from '@keyword-analizer/keyword-analizer.interfaces';

@Injectable()
export class GetPageOnKeywordIoService {
  constructor(
    @Inject(KEYWORD_ANALIZER_CONFIG_TOKEN) private readonly config: KeywordAnalizerConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
  ) {}

  async do(
    url: string,
    headless: boolean,
  ): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const browser: Browser = await puppeteer.launch({
      headless,
      args: ['--profile-directory="/Users/sandordeli/Documents"', '--no-sandbox'],
      userDataDir: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/user-data',
    });

    let page: Page = await browser.newPage();

    page = await this.puppeteerUtils.preparePageForDetection(page);
    await page.goto(url);

    const isDetectableObj = await this.puppeteerUtils.isPageDetectable(page);
    console.log(isDetectableObj);

    return {
      browser,
      page,
    };
  }

  // private async setKeywdIoCookies(page: any): Promise<Page> {
  //   console.log('setting cookies');
  //   const { cookies: kywIoCookies, domain } = this.config;

  //   try {
  //     for (const [i, cookieStr] of kywIoCookies.entries()) {
  //       const [cookieName, cookieValue] = cookieStr.split('=');
  //       await page.setCookie({
  //         name: cookieName,
  //         value: cookieValue,
  //         domain,
  //         path: '/',
  //         httpOnly: true,
  //         secure: true,
  //         samesite: false,
  //       });
  //     }
  //   } catch (error) {
  //     // console.log(error);
  //   }

  //   console.log('cookies set');
  //   return page;
  // }
}
