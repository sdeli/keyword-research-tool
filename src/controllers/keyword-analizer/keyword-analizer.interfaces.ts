import { Browser } from 'puppeteer';
import { Page } from 'puppeteer-extra-plugin-recaptcha-2/dist/types';
import { supportedLanguages } from './keyword-analizer.types';

export interface StringifyAbleError {
  message: string;
  stack: string;
}

export type urlByLang = {
  [key in supportedLanguages]: string;
};

export interface KeywordIoConfigI {
  urlByLang: urlByLang;
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
  urlByLang: urlByLang;
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

export interface EntityRelationNamesI {
  [key: string]: string;
}

export interface BrowserPackageI {
  browser: Browser;
  page: Page;
}

export interface ScrapeAnaliticsForMoreKywsAndUpdateDbPAramsI {
  analiticsScrapeSessionId: string;
  suggestionsScrapeId: string;
  lang: supportedLanguages;
}
