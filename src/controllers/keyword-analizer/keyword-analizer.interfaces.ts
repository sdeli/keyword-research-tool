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
