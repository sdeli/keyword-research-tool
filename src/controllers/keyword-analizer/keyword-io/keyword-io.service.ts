import { Page, Browser } from 'puppeteer';

import { Injectable, Inject } from '@nestjs/common';
import { KeywordIoConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
import { KEYWORD_IO_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';

@Injectable()
export class KeywordIoService {
  constructor(
    @Inject(KEYWORD_IO_CONFIG_TOKEN) private readonly config: KeywordIoConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
  ) {}

  async getSuggestionsForOne(keyword: string) {
    const { browser, page: pageOnKwIo } = await this.getPageOnKywdIo();

    await this.researchForKeywordOnKywIo(pageOnKwIo, keyword);
    const hasFoundKeywordSuggestions = await this.hasFoundKeywordsToDownload(pageOnKwIo);
    if (!hasFoundKeywordSuggestions) return console.log('no suggestions found for: ' + keyword);

    await this.downloadKywSuggestionsCsvFromKywIo(pageOnKwIo);
    console.log(11);
    await browser.close();
  }

  async getPageOnKywdIo(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const { url, headless } = this.config;

    const { browser, page } = await this.puppeteerUtils.getAntiCaptchaBrowser({
      headless,
      userDataDir: '/home/sandor/Projects/keyword-research-tool/src/assets/user-data',
      downloadPath: '/home/sandor/Projects/keyword-research-tool/src/assets',
    });

    await this.puppeteerUtils.preparePageForDetection(page);

    await page.goto(url);

    return {
      browser,
      page,
    };
  }

  private async researchForKeywordOnKywIo(pageOnKwIo: Page, keyword: string): Promise<void> {
    const { researchKeywordInput, startKywResBtn, keywordsAppearedSel } = this.config.selectors;
    await this.puppeteerUtils.makeScreenshot(pageOnKwIo, 'majom');

    console.log('research on kywio starts');
    await pageOnKwIo.evaluate(researchKeywordInputSel => {
      console.log(researchKeywordInputSel);
      document.querySelector(researchKeywordInputSel).value = '';
    }, researchKeywordInput);

    console.log(researchKeywordInput);
    await pageOnKwIo.type(researchKeywordInput, keyword);

    console.log(startKywResBtn);
    await pageOnKwIo.click(startKywResBtn);

    console.log('waiting for nav');
    await pageOnKwIo.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await pageOnKwIo.waitForSelector(keywordsAppearedSel);
    console.log('keywords appeared');
  }

  private async hasFoundKeywordsToDownload(pageOnKwIo: Page): Promise<boolean> {
    return pageOnKwIo.evaluate(() => {
      const bodyElem = document.querySelector('body');
      return !bodyElem.innerText.includes('Please try again!');
    });
  }

  private async downloadKywSuggestionsCsvFromKywIo(pageOnKwIo: Page): Promise<void> {
    const { downloadCsvBtn } = this.config.selectors;

    const innertext = await pageOnKwIo.evaluate(downloadCsvBtnSel => {
      const downloadCsvBtnElem = document.querySelector(downloadCsvBtnSel);
      downloadCsvBtnElem.click();
      return downloadCsvBtnElem.innerText;
    }, downloadCsvBtn);
    console.log(innertext);
  }
}
