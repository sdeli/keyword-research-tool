import { UtilsService } from '@utils/utils.service';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { Page, Browser } from 'puppeteer';

import { Injectable, Inject } from '@nestjs/common';
import { KeywordIoConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
import { KEYWORD_IO_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';
import { GlobalConfigI } from '@shared/shared.interfaces';

@Injectable()
export class KeywordIoService {
  constructor(
    @Inject(KEYWORD_IO_CONFIG_TOKEN) private readonly config: KeywordIoConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConf: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
  ) {}

  async getSuggestionsForOne(keyword: string) {
    const { browser, page: pageOnKwIo } = await this.getPageOnKywdIo();
    await this.researchForKeywordOnKywIo(pageOnKwIo, keyword);

    const hasFoundKeywordSuggestions = await this.hasFoundKeywordsToDownload(pageOnKwIo);
    if (!hasFoundKeywordSuggestions) {
      await browser.close();
      return console.log('no suggestions found for: ' + keyword);
    }

    await this.downloadKywSuggestionsCsvFromKywIo(pageOnKwIo, keyword);
    console.log(11);
    await browser.close();
  }

  async getPageOnKywdIo(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const { url, headless } = this.config;
    const { downloadsFolder, userDataFolder } = this.globalConf;
    const { browser, page } = await this.puppeteerUtils.getAntiCaptchaBrowser({
      headless,
      userDataDir: userDataFolder,
      downloadPath: downloadsFolder,
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

  private async downloadKywSuggestionsCsvFromKywIo(pageOnKwIo: Page, keyword: string): Promise<void> {
    const { downloadCsvBtnSel } = this.config.selectors;
    const { downloadsFolder } = this.globalConf;
    const downloadCsvFileName = `Keyword Tool Export - ${keyword}.csv`;

    const downloadCsvBtn = await pageOnKwIo.$(downloadCsvBtnSel);
    if (!downloadCsvBtn) await pageOnKwIo.waitForSelector(downloadCsvBtnSel);
    await pageOnKwIo.evaluate(
      downloadCsvBtnSel => document.querySelector(downloadCsvBtnSel).click(),
      downloadCsvBtnSel,
    );

    await this.utils.waitToDownloadCsv(downloadsFolder, downloadCsvFileName);
  }
}
