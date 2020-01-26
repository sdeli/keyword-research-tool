import { UtilsService } from '@utils/utils.service';
import { Browser, Page } from 'puppeteer';

import puppeteerExtra from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha-2';
// tslint:disable-next-line:no-var-requires
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

import { PreparePageForDetection } from './prepare-page-for-detection/prepare-page-for-detection';
import { Inject, Injectable } from '@nestjs/common';
import { GlobalConfigI } from '@shared/shared.interfaces';
import { GLOBAL_CONFIG_TOKEN } from '@shared/shared.types';

interface BrowserDataI {
  browser: Browser;
  page: Page;
}

interface PageOptsI {
  headless: boolean;
  userDataDir: string;
  downloadPath: string;
}

@Injectable()
export class PuppeteerUtilsService {
  constructor(
    @Inject(GLOBAL_CONFIG_TOKEN) private readonly globalConfig: GlobalConfigI,
    private readonly prepare: PreparePageForDetection,
    private readonly utils: UtilsService,
  ) {}

  preparePageForDetection(page: Page) {
    return this.prepare.do(page);
  }

  async getAntiCaptchaBrowser(pageOpts: PageOptsI): Promise<BrowserDataI> {
    const { headless, userDataDir, downloadPath } = pageOpts;
    const { captcha2dToken, captcha2dId } = this.globalConfig;

    puppeteerExtra.use(StealthPlugin());
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
      slowMo: 50,
      userDataDir,
      executablePath: '/usr/bin/google-chrome-stable',
      args: ['--disable-gpu', '--disable-software-rasterizer'],
    };

    const browser = await puppeteerExtra.launch(pupeteerExtraOpts);
    const page = await browser.newPage();

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath,
    });

    return { browser, page };
  }

  async tryClearInputFieldAndType(page: Page, inputFieldSel: string, text: string): Promise<boolean> {
    let succesfullyWroteIntoInputField = false;
    let tryCount = 0;

    do {
      console.log('trying to type: ' + text);
      await page.evaluate(inputFieldSel => {
        document.querySelector(inputFieldSel).value = '';
      }, inputFieldSel);
      await page.type(inputFieldSel, text);

      const inputsValue = await this.getInputFieldsValue(page, inputFieldSel);
      if (inputsValue === text) succesfullyWroteIntoInputField = true;
      else {
        tryCount++;
        await this.utils.wait(1000);
      }
    } while (!succesfullyWroteIntoInputField && tryCount < 15);

    return succesfullyWroteIntoInputField;
  }

  async getInputFieldsValue(page: Page, inputFieldSel: string) {
    return await page.evaluate(inputFieldSel => {
      return document.querySelector(inputFieldSel).value;
    }, inputFieldSel);
  }

  isPageDetectable(page: Page): Promise<any> {
    return page.evaluate(async () => {
      let permissionStatus;

      try {
        permissionStatus = await (navigator as any).permissions.query({
          name: 'notifications',
        });
      } catch (error) {
        console.log(error);
      }

      return {
        agent: window.navigator.userAgent || 'no value',
        isWebdriver: navigator.webdriver || 'no value',
        isChrome: (window as any).isChrome || 'no value',
        chrome: (window as any).chrome || 'no value',
        pluginsLength: navigator.plugins.length,
        languages: navigator.languages,
        permissions: Notification.permission || 'no value',
        state: permissionStatus.state || 'no value',
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      };
    });
  }

  async solveCaptchas(page: Page): Promise<void> {
    console.log('solving captchas');
    const { error } = await page.solveRecaptchas();
    if (error) throw new Error(error);
    console.log('solved captcha');
  }

  async hasCaptchasOnPage(page: Page) {
    const captchasOnPage = [];

    const { captchas, error } = await page.findRecaptchas();
    if (error) throw new Error(error);
    if (captchas.length > 0) captchasOnPage.push(...captchas);

    return captchasOnPage.length > 0;
  }

  async makeScreenshot(page: Page, phrase: string): Promise<void> {
    const now = new Date();
    await page.screenshot({ path: `${process.cwd()}/src/assets/${phrase}-${now}.png` });
  }
}

// var storage = window['sessionStorage'];
// var storageObj = {};
//
// for (let i = 0; i < window['sessionStorage'].length; i++) {
//   const key = storage.key(i);
//   storageObj[key] = storage.getItem(key);
// }
//
// var gecc = JSON.stringify(storageObj, null, 2);
