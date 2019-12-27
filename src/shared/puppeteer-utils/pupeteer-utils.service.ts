import { UtilsService } from '@utils/utils/utils.service';
import { StorageTypes } from '@utils/utils.types';
import { Page } from 'puppeteer';
import { Repository, UpdateResult } from 'typeorm';

import { PreparePageForDetection } from './prepare-page-for-detection/prepare-page-for-detection';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '@puppeteer-utils/entities/session.entity';

@Injectable()
export class PuppeteerUtilsService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    private readonly prepare: PreparePageForDetection,
    private readonly utils: UtilsService,
  ) {}

  preparePageForDetection(page: Page) {
    return this.prepare.do(page);
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

  async saveCookies(page: Page, sessionUserEmail: string): Promise<UpdateResult> {
    const cookies = await page.cookies();
    const cookiesJson = JSON.stringify(cookies);

    return this.sessionRepo
      .createQueryBuilder()
      .update()
      .set({ cookies: cookiesJson })
      .where('email = :email', { email: sessionUserEmail })
      .execute();
    // return this.utils.saveIntoFile(cookiesFilePath, cookiesJson, 'cookies');
  }

  async solveCaptchas(page: Page): Promise<void> {
    let isCaptchaSolved = false;
    const { error } = await page.solveRecaptchas();
    if (error) throw error;

    const frames = page.mainFrame().childFrames();

    for (const frame of frames) {
      const { error } = await frame.solveRecaptchas();
      if (error) throw error;
    }

    while (!isCaptchaSolved) {
      isCaptchaSolved = await this.hasCaptchasOnPage(page);
      await this.utils.wait(2000);
      console.log('captcha still not solved');
    }

    console.log('captcha solved yeeee');
  }

  async hasCaptchasOnPage(page: Page) {
    const captchasOnPage = [];
    const frames = page.mainFrame().childFrames();

    const { captchas, error } = await page.findRecaptchas();
    if (error) throw error;
    if (captchas.length > 0) captchasOnPage.push(...captchas);

    for (const frame of frames) {
      const { captchas, error } = await frame.findRecaptchas();
      if (error) throw error;
      if (captchas.length > 0) captchasOnPage.push(...captchas);
    }

    return captchasOnPage.length > 0;
  }

  // async loadCookies(page: Page): Promise<Page> {
  //   const hasCookiesFile = fs.existsSync(cookiesFilePath);
  //   if (!hasCookiesFile) {
  //     console.log('there are no cookies file');
  //     return page;
  //   }
  //
  //   const cookiesArr = require(cookiesFilePath);
  //   if (cookiesArr.length !== 0) {
  //     for (const cookie of cookiesArr) {
  //       await page.setCookie(cookie);
  //     }
  //
  //     console.log('Cookies have been loaded into the page');
  //   }
  //
  //   return page;
  // }

  // async saveLocalStorage(page: Page): Promise<void> {
  //   const localStorageJSON = await this.getStorageFromPage(page, StorageTypes.LOCAL);
  //   console.log('localStorageJSON:');
  //   console.log(localStorageJSON);
  //
  //   return this.utils.saveIntoFile(localStorageFilePath, localStorageJSON, 'local storage');
  // }

  // async loadLocalStorage(page: Page): Promise<Page> {
  //   const hasLocalStorageFile = fs.existsSync(localStorageFilePath);
  //   if (!hasLocalStorageFile) {
  //     console.log('there are no local storage from prev session');
  //     return page;
  //   }
  //
  //   const localStorage = require(localStorageFilePath);
  //   console.log(localStorage);
  //   await page.evaluate(localStorageObj => {
  //     for (const localStorageKey in localStorageObj) {
  //       if (localStorageObj.hasOwnProperty(localStorageKey)) {
  //         const currLocalStorageValue = localStorageObj[localStorageKey];
  //         console.log(`${localStorageKey}: ${currLocalStorageValue}`);
  //         localStorage.setItem(localStorageKey, currLocalStorageValue);
  //       }
  //     }
  //   }, localStorage);
  //
  //   return page;
  // }

  async saveSessionStorage(page: Page, sessionUserEmail): Promise<UpdateResult> {
    const sessionStorageJSON = await this.getStorageFromPage(page, StorageTypes.SESSION);

    return this.sessionRepo
      .createQueryBuilder()
      .update()
      .set({ session: sessionStorageJSON })
      .where('email = :email', { email: sessionUserEmail })
      .execute();
  }

  // async loadSessionStorage(page: Page): Promise<Page> {
  //
  //   if (!hasSessionStorage) {
  //     console.log('there is no local session storage from prev session');
  //     return page;
  //   }
  //
  //   const sessionStorage = require(sessionFilePath);
  //
  //   await page.evaluate(sessionStorageObj => {
  //     for (const sessionStorageKey in sessionStorageObj) {
  //       if (sessionStorageObj.hasOwnProperty(sessionStorageKey)) {
  //         const currSessionStorageValue = sessionStorageObj[sessionStorageKey];
  //         console.log(`${sessionStorageKey}: ${currSessionStorageValue}`);
  //         sessionStorage.setItem(sessionStorageKey, currSessionStorageValue);
  //       }
  //     }
  //   }, sessionStorage);
  //
  //   return page;
  // }

  // saveSessions(page: Page): Promise<void[]> {
  //   const saveSessionsPromises = [this.saveCookies(page), this.saveLocalStorage(page), this.saveSessionStorage(page)];
  //
  //   return Promise.all(saveSessionsPromises);
  // }

  private async getStorageFromPage(page: Page, storageType: StorageTypes): Promise<string> {
    return await page.evaluate(storageTypeStr => {
      const storage = window[storageTypeStr];
      const storageObj = {};

      for (let i = 0; i < window[storageTypeStr].length; i++) {
        const key = (storage as any).key(i);
        storageObj[key] = (storage as any).getItem(key);
      }

      return JSON.stringify(storageObj, null, 2);
    }, storageType);
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
