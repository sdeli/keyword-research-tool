import { UtilsService } from '@utils/utils.service';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { Page, Browser } from 'puppeteer';
// @ts-ignore
import { csv } from 'csvtojson';
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { KeywordIoConfigI, SaveScrapeSessionParamsI } from '@keyword-analizer/keyword-analizer.interfaces';
import { KEYWORD_IO_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { Keyword } from '@keyword-analizer/entities/keyword.entity';

@Injectable()
export class KeywordIoService {
  constructor(
    @Inject(KEYWORD_IO_CONFIG_TOKEN) private readonly config: KeywordIoConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConf: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
    @InjectRepository(Keyword) private readonly keywordRepo: Repository<Keyword>,
  ) {}

  async scrapeSuggestionsForOneAndSaveInDb(scrapeSessionId: string, keyword: string) {
    console.log(`getting suggestions for: ${keyword}`);
    const saveScrapeSessionParams: SaveScrapeSessionParamsI = {
      scrapeSessionId,
      path: 'keyword/suggestions/:keyword',
      keyword,
    };

    try {
      const { browser, page: pageOnKwIo } = await this.getPageOnKywdIo();
      console.log('got anti captcah page on keyword.io');

      await this.researchForKeywordOnKywIo(pageOnKwIo, keyword);
      console.log('research for suggestions done');

      const hasFoundKeywordSuggestions = await this.hasFoundKeywordsToDownload(pageOnKwIo);
      if (!hasFoundKeywordSuggestions) {
        await browser.close();
        return console.log('no suggestions found');
      } else console.log('found suggestions');

      const downloadedFilePath = await this.downloadKywSuggestionsCsvFromKywIo(pageOnKwIo, keyword);
      console.log(`${downloadedFilePath} => is downloaded`);

      await browser.close();

      await this.saveSuggestionsIntoDbFromCsv(downloadedFilePath, keyword);
      console.log('keyword suggestions saved into db');

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

    await pageOnKwIo.type(researchKeywordInput, keyword);

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

  private async downloadKywSuggestionsCsvFromKywIo(pageOnKwIo: Page, keyword: string): Promise<string> {
    const { downloadCsvBtnSel } = this.config.selectors;
    const { downloadsFolder } = this.globalConf;
    const downloadCsvFileName = `Keyword Tool Export - ${keyword}.csv`;

    const downloadCsvBtn = await pageOnKwIo.$(downloadCsvBtnSel);
    if (!downloadCsvBtn) await pageOnKwIo.waitForSelector(downloadCsvBtnSel);
    const clickDownloadCsvBtnPromise = pageOnKwIo.evaluate(
      downloadCsvBtnSel => document.querySelector(downloadCsvBtnSel).click(),
      downloadCsvBtnSel,
    );

    const waitForFileDownloadPromise = this.utils.waitToDownloadFile(downloadsFolder, downloadCsvFileName);

    console.log('file download starts');
    await Promise.all([clickDownloadCsvBtnPromise, waitForFileDownloadPromise]);
    console.log(`${downloadCsvFileName} has been downloaded`);

    const downloadedCsvPath = `${downloadsFolder}/${downloadCsvFileName}`;
    return downloadedCsvPath;
  }

  private async saveSuggestionsIntoDbFromCsv(downloadedFilePath: string, keyword: string) {
    const kywSuggestions: any[] = await csv({ noheader: true }).fromFile(downloadedFilePath);
    const keywordEntities = await this.parseSuggestionsIntoKeywEntities(kywSuggestions, keyword);

    await this.keywordRepo.save(keywordEntities);
    console.log('keyword suggestions have been saved to db');
  }

  private async parseSuggestionsIntoKeywEntities(kywSuggestions: any[], keyword: string): Promise<Keyword[]> {
    const keywordEntities = kywSuggestions.map(currKeywSuggestion => {
      const keywordEntity = new Keyword();
      keywordEntity.keyword = currKeywSuggestion['field1'];

      return keywordEntity;
    });

    const keywordEntity = new Keyword();
    keywordEntity.keyword = keyword;
    keywordEntities.unshift(keywordEntity);

    return keywordEntities;
  }
}
