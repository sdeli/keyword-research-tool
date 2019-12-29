import { Not } from 'typeorm';

import { UtilsService } from '@utils/utils/utils.service';
import { StorageTypes } from '@utils/utils.types';
import { Page } from 'puppeteer';
import { Repository } from 'typeorm';

import { PreparePageForDetection } from './prepare-page-for-detection/prepare-page-for-detection';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '@puppeteer-utils/entities/session.entity';
import { SessionUser } from '@puppeteer-utils/entities/session-user.entity';
import { BrowserSessionI } from '@puppeteer-utils/pupeteer-utils.interfaces';

interface SaveSessionParamsI {
  page: Page;
  domain: string;
  sessionId?: number;
}

@Injectable()
export class PuppeteerUtilsService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(SessionUser) private readonly sessionUserRepo: Repository<SessionUser>,
    private readonly prepare: PreparePageForDetection,
  ) {}

  preparePageForDetection(page: Page) {
    return this.prepare.do(page);
  }

  async clearInputFieldAndType(page: Page, inputFieldSel: string, text: string): Promise<void> {
    await page.evaluate(inputFieldSel => {
      // @ts-ignore
      document.querySelector(inputFieldSel).value = '';
    }, inputFieldSel);

    await page.type(inputFieldSel, text);
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
    if (error) throw error;
    console.log('solved captcha');
    // const frames = page.mainFrame().childFrames();
    //
    // for (const frame of frames) {
    //   console.log('found new captcha => solving');
    //   const { error } = await frame.solveRecaptchas();
    //   if (error) throw error;
    //   console.log('solved captcha');
    // }
  }

  async hasCaptchasOnPage(page: Page) {
    const captchasOnPage = [];
    // const frames = page.mainFrame().childFrames();

    const { captchas, error } = await page.findRecaptchas();
    if (error) throw error;
    if (captchas.length > 0) captchasOnPage.push(...captchas);

    // for (const frame of frames) {
    //   const { captchas, error } = await frame.findRecaptchas();
    //   if (error) throw error;
    //   if (captchas.length > 0) captchasOnPage.push(...captchas);
    // }

    return captchasOnPage.length > 0;
  }

  // async loadSessionIntoPage(page: Page, session: Session): Promise<Page> {
  //   // const cookies = session.cookies;
  //   const cookies = JSON.parse(session.cookies);
  //   const sessionStorage = JSON.parse(session.session);
  //
  //   for (const cookie of cookies) {
  //     await page.setCookie(cookie);
  //   }
  //
  //   // this.loadSessionStorageIntoPage(page, sessionStorage);
  //   console.log('cookies and session have been loaded into the page');
  //
  //   return page;
  // }
  //
  // async saveSession(saveSessionParams: SaveSessionParamsI): Promise<void> {
  //   const { page, domain, sessionId } = saveSessionParams;
  //   const sessionStorage = await this.getStorageFromPage(page, StorageTypes.SESSION);
  //   const cookies = await page.cookies();
  //
  //   if (!sessionId) {
  //     const session = await this.createSessionEntity(cookies, sessionStorage, domain);
  //     session.inUse = false;
  //     await this.sessionRepo.save(session);
  //     return;
  //   }
  //
  //   await this.sessionRepo.update(
  //     { id: sessionId },
  //     {
  //       cookies: JSON.stringify(cookies),
  //       session: JSON.stringify(sessionStorage),
  //       inUse: false,
  //     },
  //   );
  // }
  //
  // private async createSessionEntity(
  //   cookies: BrowserSessionI,
  //   sessionStorage: BrowserSessionI,
  //   domain: string,
  // ): Promise<Session> {
  //   const session = new Session();
  //   session.cookies = JSON.stringify(cookies);
  //   session.session = JSON.stringify(sessionStorage);
  //   session.domain = domain;
  //
  //   return session;
  // }
  //
  // async getFreeSession(domain: string, withUser: boolean): Promise<Session> {
  //   const freeSessionFindOptions = {
  //     where: {
  //       inUse: false,
  //       domain,
  //       sessionUserId: withUser ? Not(null) : undefined,
  //     },
  //     relations: ['sessionUser'],
  //   };
  //
  //   const freeSession = await this.sessionRepo.findOne(freeSessionFindOptions);
  //   if (freeSession) {
  //     freeSession.inUse = true;
  //     await this.sessionRepo.save(freeSession);
  //   }
  //
  //   return freeSession;
  // }

  async makeScreenshot(page: Page): Promise<void> {
    const now = new Date();
    await page.screenshot({ path: `/home/sandor/Projects/keyword-research-tool/src/assets/${now}.png` });
  }

  // private async getStorageFromPage(page: Page, storageType: StorageTypes): Promise<object> {
  //   return await page.evaluate(storageTypeStr => {
  //     const storage = window[storageTypeStr];
  //     const storageObj = {};
  //
  //     for (let i = 0; i < window[storageTypeStr].length; i++) {
  //       const key = (storage as any).key(i);
  //       storageObj[key] = (storage as any).getItem(key);
  //     }
  //
  //     return storageObj;
  //   }, storageType);
  // }

  // private loadSessionStorageIntoPage(page: Page, sessionStorage: BrowserSessionI): Promise<void> {
  //   return page.evaluate(sessionStorage => {
  //     for (const sessionStorageKey in sessionStorage) {
  //       if (sessionStorage.hasOwnProperty(sessionStorageKey)) {
  //         const currSessionStorageValue = sessionStorage[sessionStorageKey];
  //         console.log(`${sessionStorageKey}: ${currSessionStorageValue}`);
  //         sessionStorage.setItem(sessionStorageKey, currSessionStorageValue);
  //       }
  //     }
  //   }, sessionStorage);
  // }
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
