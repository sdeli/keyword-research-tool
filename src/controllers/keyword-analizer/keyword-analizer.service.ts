import { UtilsService } from '@utils/utils/utils.service';
import { Page } from 'puppeteer';
import { Injectable, Inject } from '@nestjs/common';
import { KeywordAnalizerConfigI } from './keyword-analizer.interfaces';
import { KEYWORD_ANALIZER_CONFIG_TOKEN } from './keyword-analizer.types';
import { GetPageOnKeywordIoService } from './get-page-on-keyword-io/get-page-on-keyword-io.service';

@Injectable()
export class KeywordAnalizerService {
  constructor(
    @Inject(KEYWORD_ANALIZER_CONFIG_TOKEN) private readonly config: KeywordAnalizerConfigI,
    private readonly utils: UtilsService,
    private readonly getPageOnKywdIo: GetPageOnKeywordIoService,
  ) {}

  async analizeOne(keyword: string, deepness: number) {
    const { browser, page: pageOnKwIo } = await this.getPageOnKywdIo.do(this.config.url, this.config.headless);
    await pageOnKwIo.screenshot({ path: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/page1.png' });

    await this.researchForKeywordOnKywIo(pageOnKwIo, keyword);
    await pageOnKwIo.screenshot({ path: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/page2.png' });
    await this.downloadKywResCsv(pageOnKwIo);
    await pageOnKwIo.screenshot({ path: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/page3.png' });

    // await browser.close();
  }

  private async researchForKeywordOnKywIo(pageOnKwIo: Page, keyword: string): Promise<void> {
    const { researchKeywordInput, startKywResBtn, keywordsAppearedBox } = this.config.selectors;
    await pageOnKwIo.screenshot({ path: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/page.' });

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

  private async downloadKywResCsv(pageOnKwIo: Page): Promise<void> {
    const { downloadCsvBtn } = this.config.selectors;
    const client = await pageOnKwIo.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/majom.csv',
    });

    const innertext = await pageOnKwIo.evaluate(downloadCsvBtnSel => {
      const downloadCsvBtnElem = document.querySelector(downloadCsvBtnSel);
      downloadCsvBtnElem.click();
      return downloadCsvBtnElem.innerText;
    }, downloadCsvBtn);
    console.log(innertext);
  }

  private async getKeywords(page: Page): Promise<string[]> {
    const keywordCellsSel = this.config.selectors.keywordCells;
    return await page.evaluate(keywordCellsSel => {
      const keywordCells: HTMLElement[] = Array.prototype.slice.call(document.querySelectorAll(keywordCellsSel));
      return keywordCells.map(keywordCell => keywordCell.innerText);
    }, keywordCellsSel);
  }
}
