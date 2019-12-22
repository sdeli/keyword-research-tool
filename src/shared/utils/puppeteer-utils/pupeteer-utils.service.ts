import { UtilsService } from '@utils/utils/utils.service';
import { StorageTypes } from '@utils/utils.types';
import * as fs from 'fs';

import { Page } from 'puppeteer';
import { PreparePageForDetection } from './prepare-page-for-detection/prepare-page-for-detection';
import { Injectable, Inject } from '@nestjs/common';
import { UtilsConfigI } from '@utils/utils.interfaces';
import { UTILS_CONFIG_TOKEN } from '@utils/utils.types';

@Injectable()
export class PuppeteerUtilsService {
  constructor(
    private readonly prepare: PreparePageForDetection,
    @Inject(UTILS_CONFIG_TOKEN) private readonly config: UtilsConfigI,
    private readonly utils: UtilsService,
  ) {}

  preparePageForDetection(page: Page) {
    return this.prepare.do(page);
  }

  async isPageDetectable(page: Page): Promise<any> {
    const detectable = await page.evaluate(async () => {
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

    return detectable;
  }

  async saveCookies(page: Page): Promise<void> {
    const { cookiesFilePath } = this.config;
    const cookiesObject = await page.cookies();
    const cookiesJson = JSON.stringify(cookiesObject, null, 2);

    return this.utils.saveIntoFile(cookiesFilePath, cookiesJson, 'cookies');
  }

  async loadCookies(page: Page): Promise<Page> {
    const { cookiesFilePath } = this.config;

    const hasCookiesFile = fs.existsSync(cookiesFilePath);
    if (!hasCookiesFile) {
      console.log('there are no cookies file');
      return page;
    }

    const cookiesArr = require(cookiesFilePath);
    if (cookiesArr.length !== 0) {
      for (const cookie of cookiesArr) {
        await page.setCookie(cookie);
      }

      console.log('Cookies have been loaded into the page');
    }

    return page;
  }

  async saveLocalStorage(page: Page): Promise<void> {
    const { localStorageFilePath } = this.config;

    const localStorageJSON = await this.getStorageFromPage(page, StorageTypes.LOCAL);
    console.log('localStorageJSON:');
    console.log(localStorageJSON);

    return this.utils.saveIntoFile(localStorageFilePath, localStorageJSON, 'local storage');
  }

  async loadLocalStorage(page: Page): Promise<Page> {
    const { localStorageFilePath } = this.config;

    const hasLocalStorageFile = fs.existsSync(localStorageFilePath);
    if (!hasLocalStorageFile) {
      console.log('there are no local storage from prev session');
      return page;
    }

    const localStorage = require(localStorageFilePath);
    console.log(localStorage);
    await page.evaluate(localStorageObj => {
      for (const localStorageKey in localStorageObj) {
        if (localStorageObj.hasOwnProperty(localStorageKey)) {
          const currLocalStorageValue = localStorageObj[localStorageKey];
          console.log(`${localStorageKey}: ${currLocalStorageValue}`);
          localStorage.setItem(localStorageKey, currLocalStorageValue);
        }
      }
    }, localStorage);

    return page;
  }

  async saveSessionStorage(page: Page): Promise<void> {
    const { sessionFilePath } = this.config;

    const sessionStorageJSON = await this.getStorageFromPage(page, StorageTypes.SESSION);
    console.log('Session:');
    console.log(sessionStorageJSON);

    return this.utils.saveIntoFile(sessionFilePath, sessionStorageJSON, 'session storage');
  }

  async loadSessionStorage(page: Page): Promise<Page> {
    const { sessionFilePath } = this.config;

    const hasSessionStorageFile = fs.existsSync(sessionFilePath);
    if (!hasSessionStorageFile) {
      console.log('there are no local storage from prev session');
      return page;
    }

    const sessionStorage = require(sessionFilePath);

    await page.evaluate(sessionStorageObj => {
      for (const sessionStorageKey in sessionStorageObj) {
        if (sessionStorageObj.hasOwnProperty(sessionStorageKey)) {
          const currSessionStorageValue = sessionStorageObj[sessionStorageKey];
          console.log(`${sessionStorageKey}: ${currSessionStorageValue}`);
          sessionStorage.setItem(sessionStorageKey, currSessionStorageValue);
        }
      }
    }, sessionStorage);

    return page;
  }

  saveSessions(page: Page): Promise<void[]> {
    const saveSessionsPromises = [this.saveCookies(page), this.saveLocalStorage(page), this.saveSessionStorage(page)];

    return Promise.all(saveSessionsPromises);
  }

  private async getStorageFromPage(page: Page, storageType: StorageTypes): Promise<string> {
    const storageJSON = await page.evaluate(storageTypeStr => {
      const storage = window[storageTypeStr];
      const storageObj = {};

      for (let i = 0; i < window[storageTypeStr].length; i++) {
        const key = (storage as any).key(i);
        storageObj[key] = (storage as any).getItem(key);
      }

      return JSON.stringify(storageObj, null, 2);
    }, storageType);

    return storageJSON;
  }
}
