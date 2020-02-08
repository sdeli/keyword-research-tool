import { Browser } from 'puppeteer';
import { Page } from 'puppeteer-extra-plugin-recaptcha-2/dist/types';

export interface StringifyAbleError {
  message: string;
  stack: string;
}

export interface KeywordIoConfigI {
  url: string;
  urlIncludes: string;
  domain: string;
  headless: boolean;
  selectors: {
    researchKeywordInput: string;
    downloadCsvBtnSel: string;
    startKywResBtn: string;
    keywordsAppearedSel: string;
  };
  cookies: string[];
}

export interface UbersuggestConfigI {
  url: string;
  urlIncludes: string;
  domain: string;
  headless: boolean;
  selectors: {
    researchKeywordInput: string;
    keywordResearchResAppearedSel: string;
    loginWithGoogleBtnSel: string;
    loggedInImgSel: string;
  };
  cookies: string[];
}

export interface SaveScrapeSessionParamsI {
  scrapeSessionId: string;
  keyword?: string;
  path: string;
  err?: Error;
  isSuccesful?: boolean;
}

export interface EntityRelationNames {
  [key: string]: string;
}

export interface BrowserPackageI {
  browser: Browser;
  page: Page;
}
