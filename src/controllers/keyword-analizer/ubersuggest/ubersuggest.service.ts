import { UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';

import { Injectable, Inject } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';

import puppeteerExtra from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha-2';

import { UBERSUGGEST_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';
import { PuppeteerUtilsService } from '@puppeteer-utils/pupeteer-utils.service';

@Injectable()
export class UbersuggestService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConfig: GlobalConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
  ) {}

  async getAnaliticsForOne(/*keyword: string*/) {
    const { /*browser,*/ page: pageOnUbersuggest } = await this.getAntiCaptchaPageOnUbersuggest();
    await this.puppeteerUtils.saveCookies(pageOnUbersuggest, 'bgfkszmsdeli@gmail.com');
    await this.puppeteerUtils.saveSessionStorage(pageOnUbersuggest, 'bgfkszmsdeli@gmail.com');
    console.log('close');
    // await pageOnUbersuggest.screenshot({
    //   path: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/ubersugg1.png',
    // });
  }

  private async getAntiCaptchaPageOnUbersuggest(): Promise<{ browser: Browser; page: Page }> {
    const { url, headless } = this.config;
    const { captcha2dToken, captcha2dId } = this.globalConfig;

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
      args: ['--profile-directory="/Users/sandordeli/Documents"', '--no-sandbox'],
      userDataDir: '/Users/sandordeli/Projects/keyword-research-tool/src/assets/user-data',
      slowMo: 10,
    };

    const browser = await puppeteerExtra.launch(pupeteerExtraOpts);
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector(this.config.selectors.researchKeywordInput);
    await page.waitFor(3000);
    const { captchas } = await page.findRecaptchas();
    const hasCaptchaOnPage = captchas.length > 0;
    if (hasCaptchaOnPage) {
      const { error } = await page.solveRecaptchas();
      if (error) throw error;
    }

    return {
      browser,
      page,
    };
  }

  private triggerKeywCsvDownload(page: Page): Promise<void> {
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
