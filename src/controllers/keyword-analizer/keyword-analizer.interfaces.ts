export interface StringifyAbleError {
  message: string;
  stack: string;
}

export interface KeywordIoConfigI {
  url: string;
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
