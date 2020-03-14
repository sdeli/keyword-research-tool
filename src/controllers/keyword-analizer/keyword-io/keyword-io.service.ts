import { Keyword } from '@keyword-analizer/entities/keyword.entity';
import { ScrapeSession } from '@keyword-analizer/entities/scrape-session.entity';
import {
  BrowserPackageI,
  KeywordIoConfigI,
  SaveScrapeSessionParamsI,
} from '@keyword-analizer/keyword-analizer.interfaces';
import { KEYWORD_IO_CONFIG_TOKEN, supportedLanguages } from '@keyword-analizer/keyword-analizer.types';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';
import { KeywordIoScraperParams } from '@shared/process-queue/process-queue.types';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { UtilsService } from '@utils/utils.service';
// @ts-ignore
import { csv } from 'csvtojson';
import { writeFileSync } from 'fs';
import { Page } from 'puppeteer';
import { Repository } from 'typeorm';

@Injectable()
export class KeywordIoService {
  constructor(
    @Inject(KEYWORD_IO_CONFIG_TOKEN) private readonly config: KeywordIoConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConf: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly utils: UtilsService,
    @InjectRepository(Keyword) private readonly keywordRepo: Repository<Keyword>,
  ) {}

  async updateScrapeSessionWithError(scrapeSessionId: string, error: Error) {
    return this.utils.updateScrapeSessionWithError(scrapeSessionId, error);
  }

  async scrapeSuggestionsForOneAndSaveInDb(params: KeywordIoScraperParams): Promise<void> {
    const { suggestionsScrapeSessionId, keyword, lang } = params;
    console.log(`getting suggestions for: ${keyword}`);

    const saveScrapeSessionParams: SaveScrapeSessionParamsI = {
      scrapeSessionId: suggestionsScrapeSessionId,
      path: 'keyword/suggestions/:keyword',
      keyword,
    };

    try {
      const scrapeSession = await this.utils.saveScrapeSession(saveScrapeSessionParams);
      console.log('scrape session saved');

      const browserPackage = await this.getPageOnKywdIo(lang, suggestionsScrapeSessionId);
      if (!browserPackage) {
        console.log('keywordio always detects');
        await this.utils.updateScrapeSessionWithError(suggestionsScrapeSessionId, Error('keywordio always detects'));
      }

      // tslint:disable-next-line: no-var-keyword prefer-const
      var { browser, page: pageOnKwIo } = browserPackage as BrowserPackageI;
      console.log('got anti captcah page on keyword.io');

      await this.researchForKeywordOnKywIo(pageOnKwIo, keyword);
      console.log('research for suggestions done');

      const hasFoundKeywordSuggestions = await this.hasFoundKeywordsToDownload(pageOnKwIo);
      if (!hasFoundKeywordSuggestions) {
        await browser.close();
        saveScrapeSessionParams.isSuccesful = true;
        await this.utils.saveScrapeSession(saveScrapeSessionParams);
        console.log('no suggestions found, session saved to be succesfuls');
        return;
      } else console.log('found suggestions');

      const downloadedFilePath = await this.downloadKywSuggestionsCsvFromKywIo(pageOnKwIo, keyword);
      console.log(`${downloadedFilePath} => is downloaded`);

      await browser.close();

      await this.saveSuggestionsIntoDbFromCsv(downloadedFilePath, keyword, scrapeSession);
      console.log('keyword suggestions saved into db');

      this.utils.deleteFileSync(downloadedFilePath);
      console.log(`${downloadedFilePath} => is deleted`);

      saveScrapeSessionParams.isSuccesful = true;
      await this.utils.saveScrapeSession(saveScrapeSessionParams);
      console.log('scrape session updated to be succesfuls');
    } catch (err) {
      console.error(err);
      await this.puppeteerUtils.makeScreenshot(pageOnKwIo, suggestionsScrapeSessionId);
      const html = await pageOnKwIo.content();
      writeFileSync('majom.html', html, 'utf-8');
      await this.utils.updateScrapeSessionWithError(suggestionsScrapeSessionId, err);
      console.log('scrape session updated with error');
    }
  }

  async getPageOnKywdIo(
    lang: supportedLanguages,
    suggestionsScrapeSessionId: string,
  ): Promise<BrowserPackageI | boolean> {
    const { urlByLang, headless } = this.config;
    const { downloadsFolder, userDataFolder } = this.globalConf;

    let detectedCount = 0;
    let keywordIoIsAlwaysDetectingUs = false;

    while (!keywordIoIsAlwaysDetectingUs) {
      try {
        // tslint:disable-next-line: no-var-keyword prefer-const
        var { browser, page } = await this.puppeteerUtils.getAntiCaptchaBrowser({
          headless,
          userDataDir: userDataFolder,
          downloadPath: downloadsFolder,
        });

        await this.puppeteerUtils.preparePageForDetection(page);

        await page.goto(urlByLang[lang]);

        const isPageScrapable = await this.isPageScrapable(page, suggestionsScrapeSessionId);
        if (isPageScrapable) break;
        else {
          detectedCount++;
          keywordIoIsAlwaysDetectingUs = detectedCount > 15;
          await this.puppeteerUtils.makeScreenshot(page, 'keyword-io-detected');
          console.log('keyword io detected us, screenshot made, waiting and requesting new page');
          await this.utils.waitBetween(35000, 20000);
        }
      } catch (error) {
        console.error(error);
      }
    }

    if (keywordIoIsAlwaysDetectingUs) return false;

    return {
      browser,
      page,
    };
  }

  private async isPageScrapable(pageOnKwIo: Page, suggestionsScrapeSessionId: string): Promise<boolean> {
    const {
      urlIncludes,
      selectors: { researchKeywordInput, startKywResBtn, socialModalSel },
    } = this.config;

    const currUrl = pageOnKwIo.url();
    const isOnCorrectPage = currUrl.includes(urlIncludes);
    if (!isOnCorrectPage) return false;

    const researchKeywordInputElem = await pageOnKwIo.$(researchKeywordInput);
    if (!researchKeywordInputElem) return false;

    const startKywResBtnElem = await pageOnKwIo.$(startKywResBtn);
    if (!startKywResBtnElem) return false;

    console.log(socialModalSel);
    const isPageBlockingsocialModalVisible = await this.puppeteerUtils.isVisible(pageOnKwIo, socialModalSel);

    console.log(!!isPageBlockingsocialModalVisible);
    if (isPageBlockingsocialModalVisible) {
      await this.closeSocialModal(pageOnKwIo, suggestionsScrapeSessionId);
    }

    return true;
  }

  private async closeSocialModal(pageOnKwIo: Page, suggestionsScrapeSessionId: string): Promise<boolean> {
    console.log('closing social modal');
    const {
      selectors: { socialModalSel },
    } = this.config;

    let clickedKeywordResearchBtnCounter = 0;
    const maxClickTryCount = 15;

    while (clickedKeywordResearchBtnCounter <= maxClickTryCount) {
      try {
        await pageOnKwIo.click(socialModalSel);
        await this.puppeteerUtils.isVisible(pageOnKwIo, socialModalSel);
        console.log('succesfully closed social modal');
        return true;
      } catch (err) {
        clickedKeywordResearchBtnCounter++;
        console.log('social modal is still visible: ' + clickedKeywordResearchBtnCounter);
        await this.puppeteerUtils.makeScreenshot(pageOnKwIo, `${suggestionsScrapeSessionId}-social-modal-visible`);
        await this.utils.wait(3000);
      }
    }

    throw new Error('unable to close social modal');
  }

  private async researchForKeywordOnKywIo(pageOnKwIo: Page, keyword: string): Promise<void> {
    const { researchKeywordInput, startKywResBtn, keywordsAppearedSel } = this.config.selectors;

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

  private async saveSuggestionsIntoDbFromCsv(
    downloadedFilePath: string,
    keyword: string,
    scrapeSession: ScrapeSession,
  ) {
    const kywSuggestions: any[] = await csv({ noheader: true }).fromFile(downloadedFilePath);
    const keywordEntities = await this.parseSuggestionsIntoKeywEntities(kywSuggestions, keyword, scrapeSession);

    await this.keywordRepo.save(keywordEntities);
    console.log('keyword suggestions have been saved to db');
  }

  private async parseSuggestionsIntoKeywEntities(
    kywSuggestions: any[],
    keyword: string,
    scrapeSession: ScrapeSession,
  ): Promise<Keyword[]> {
    const keywordEntities = kywSuggestions.map(currKeywSuggestion => {
      const keywordEntity = new Keyword();
      keywordEntity.keyword = currKeywSuggestion['field1'];
      keywordEntity.scrapeSessions = [scrapeSession];
      return keywordEntity;
    });

    const keywordEntity = new Keyword();
    keywordEntity.keyword = keyword;
    keywordEntities.unshift(keywordEntity);

    return keywordEntities;
  }
}
