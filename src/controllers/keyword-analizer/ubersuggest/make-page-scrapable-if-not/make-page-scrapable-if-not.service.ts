import { Injectable, Inject } from '@nestjs/common';
import { PuppeteerUtilsService } from '@shared/puppeteer-utils/pupeteer-utils.service';
import { Page } from 'puppeteer-extra-plugin-recaptcha-2/dist/types';
import { UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
import { UBERSUGGEST_CONFIG_TOKEN, supportedLanguages } from '@keyword-analizer/keyword-analizer.types';
import { LogInToUbersuggestService } from '../log-in-to-ubersuggest/login-to-ubersuggest.service';
import { UtilsService } from '@utils/utils.service';

@Injectable()
export class MakePageScrapableIfNotService {
  constructor(
    @Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI,
    private readonly puppeteerUtils: PuppeteerUtilsService,
    private readonly logInService: LogInToUbersuggestService,
    private readonly utils: UtilsService,
  ) {}

  async do(pageOnUbersuggest: Page, scrapeSessionId: string, lang: supportedLanguages): Promise<boolean> {
    try {
      await this.logInService.logInIfNeeded(pageOnUbersuggest);

      await this.puppeteerUtils.solveCaptchaIfNeeded(pageOnUbersuggest, 3000);

      await this.navigateToKeywordIdeaSearcPageIfNeeded(pageOnUbersuggest, scrapeSessionId, lang);

      await this.puppeteerUtils.solveCaptchaIfNeeded(pageOnUbersuggest, 3000);

      const hasAllSelectorsOnPage = await this.hasAllSelectorsOnPage(pageOnUbersuggest);
      return hasAllSelectorsOnPage;
    } catch (err) {
      throw new Error(err);
    }
  }

  private async navigateToKeywordIdeaSearcPageIfNeeded(
    pageOnUbersuggest: Page,
    scrapeSessionId: string,
    lang: supportedLanguages,
  ): Promise<void> {
    const maxTryCount = 15;
    let tryCont = 0;
    let succesfullyNavigatedToPage = false;

    while (!succesfullyNavigatedToPage && tryCont < maxTryCount) {
      try {
        await pageOnUbersuggest.goto(this.config.urlByLang[lang]);
        await pageOnUbersuggest.waitForSelector(this.config.selectors.researchKeywordInput);
        succesfullyNavigatedToPage = true;
      } catch (err) {
        tryCont++;
        console.log(`current url (at try ${tryCont}): ${pageOnUbersuggest.url()}`);
        await this.puppeteerUtils.makeScreenshot(pageOnUbersuggest, scrapeSessionId);
        await this.utils.wait(3000);
      }
    }

    if (!succesfullyNavigatedToPage) throw new Error('could not navigate to keyword idea search page at all');
  }

  private async hasAllSelectorsOnPage(pageOnUbersuggest): Promise<boolean> {
    let hasAllSelectorsOnPage = true;
    const {
      keywordResearchResAppearedSel,
      loggedInImgSel,
      loginWithGoogleBtnSel,
      researchKeywordInput,
    } = this.config.selectors;
    const hasKeywordResearchBoxOnPage = (await pageOnUbersuggest.$(researchKeywordInput)) !== null;
    if (!hasKeywordResearchBoxOnPage) {
      hasAllSelectorsOnPage = false;
      console.log(`doenst have selector: ${keywordResearchResAppearedSel} on the page`);
    }

    const hasLoggedInBtnOnPage = (await pageOnUbersuggest.$(loggedInImgSel)) !== null;
    const hasLogInBtnOnPage = (await pageOnUbersuggest.$(loginWithGoogleBtnSel)) !== null;
    if (!(hasLoggedInBtnOnPage || hasLogInBtnOnPage)) {
      hasAllSelectorsOnPage = false;
      console.log(`none of the selectors: ${loggedInImgSel} , ${loginWithGoogleBtnSel} are on the page`);
    }

    return hasAllSelectorsOnPage;
  }
}
