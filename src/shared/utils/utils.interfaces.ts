import { Page } from 'puppeteer';

export interface UtilsConfigI {
  cookiesFilePath: string;
  localStorageFilePath: string;
  sessionFilePath: string;
  userAgent: string;
}

export interface UndetectablePageI {
  page: Page;
  isDetectable: boolean;
}
