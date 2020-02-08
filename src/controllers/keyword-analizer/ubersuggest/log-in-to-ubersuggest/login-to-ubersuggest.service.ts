import { Injectable, Inject } from '@nestjs/common';
import { UbersuggestConfigI } from '@keyword-analizer/keyword-analizer.interfaces';
import { UBERSUGGEST_CONFIG_TOKEN } from '@keyword-analizer/keyword-analizer.types';
import { Page } from 'puppeteer-extra-plugin-recaptcha-2/dist/types';

@Injectable()
export class LogInToUbersuggestService {
  constructor(@Inject(UBERSUGGEST_CONFIG_TOKEN) private readonly config: UbersuggestConfigI) {}
  async logInIfNeeded(pageOnUbersuggest: Page) {
    const isLoggedIn = await this.isLoggedInToUbersuggest(pageOnUbersuggest);
    console.log('is logged in: ' + isLoggedIn);
    if (!isLoggedIn) {
      const couldLogIn = await this.tryToLogIn(pageOnUbersuggest);
      if (!couldLogIn) throw new Error('could not log into ubersuggest');
    }
  }

  async isLoggedInToUbersuggest(pageOnUbersuggest: Page): Promise<boolean> {
    const { loggedInImgSel, loginWithGoogleBtnSel } = this.config.selectors;

    const loggedInImageElemHandle = await pageOnUbersuggest.$(loggedInImgSel);
    const loginWithGoogleElemHandle = await pageOnUbersuggest.$(loginWithGoogleBtnSel);

    return Boolean(loggedInImageElemHandle && !loginWithGoogleElemHandle);
  }

  async tryToLogIn(pageOnUbersuggest): Promise<boolean> {
    const { loginWithGoogleBtnSel, loggedInImgSel } = this.config.selectors;
    let loginTriesCounter = 0;
    let successfullyLoggedIn = false;

    do {
      console.log('try to log in ' + loginTriesCounter);
      console.log(successfullyLoggedIn);
      try {
        await pageOnUbersuggest.click(loginWithGoogleBtnSel);
        await pageOnUbersuggest.waitForSelector(loggedInImgSel, { timeout: 2000 });
        successfullyLoggedIn = true;
      } catch (e) {
        loginTriesCounter++;
      }
    } while (!successfullyLoggedIn && loginTriesCounter < 10);

    console.log('got logged in');
    return successfullyLoggedIn;
  }
}
