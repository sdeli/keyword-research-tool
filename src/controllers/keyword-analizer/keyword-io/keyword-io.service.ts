import * as puppeteer from 'puppeteer';
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
    console.log('here');
    const { /*browser,*/ page: pageOnKwIo } = await this.getPageOnKywdIo();
    await pageOnKwIo.screenshot({ path: '/home/sandor/Projects/keyword-research-tool/src/assets/kywio1.png' });
    console.log('here');

    await this.researchForKeywordOnKywIo(pageOnKwIo, keyword);
    await pageOnKwIo.screenshot({ path: '/home/sandor/Projects/keyword-research-tool/src/assets/kywio2.png' });
    console.log('here');

    await this.downloadKywSuggestionsCsvFromKywIo(pageOnKwIo);
    await pageOnKwIo.screenshot({ path: '/home/sandor/Projects/keyword-research-tool/src/assets/kywio3.png' });
    console.log('here');

    // await browser.close();
  }

  async getPageOnKywdIo(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const { url, headless } = this.config;

    const browser: Browser = await puppeteer.launch({
      headless,
      args: ['--profile-directory="/Users/sandordeli/Documents"', '--no-sandbox'],
      userDataDir: '/home/sandor/Projects/keyword-research-tool/src/assets/user-data',
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

  private async researchForKeywordOnKywIo(pageOnKwIo: Page, keyword: string): Promise<void> {
    const { researchKeywordInput, startKywResBtn, keywordsAppearedBox } = this.config.selectors;

    console.log('research on kywio starts');
    await pageOnKwIo.evaluate(researchKeywordInputSel => {
      document.querySelector(researchKeywordInputSel).value = '';
    }, researchKeywordInput);

    console.log(researchKeywordInput);
    await pageOnKwIo.type(researchKeywordInput, keyword);

    console.log(startKywResBtn);
    await pageOnKwIo.click(startKywResBtn);

    console.log('waiting for nav');
    await pageOnKwIo.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await pageOnKwIo.waitForSelector(keywordsAppearedBox);
  }

  private async downloadKywSuggestionsCsvFromKywIo(pageOnKwIo: Page): Promise<void> {
    const { downloadCsvBtn } = this.config.selectors;
    const client = await pageOnKwIo.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: '/home/sandor/Projects/keyword-research-tool/src/assets',
    });

    const innertext = await pageOnKwIo.evaluate(downloadCsvBtnSel => {
      const downloadCsvBtnElem = document.querySelector(downloadCsvBtnSel);
      downloadCsvBtnElem.click();
      return downloadCsvBtnElem.innerText;
    }, downloadCsvBtn);
    console.log(innertext);
  }

  // private async getKeywords(page: Page): Promise<string[]> {
  //   const keywordCellsSel = this.config.selectors.keywordCells;
  //   return page.evaluate(keywordCellsSel => {
  //     const keywordCells: HTMLElement[] = Array.prototype.slice.call(document.querySelectorAll(keywordCellsSel));
  //     return keywordCells.map(keywordCell => keywordCell.innerText);
  //   }, keywordCellsSel);
  // }
}
