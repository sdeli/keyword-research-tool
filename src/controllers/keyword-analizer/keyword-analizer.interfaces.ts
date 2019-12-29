export interface KeywordIoConfigI {
  url: string;
  domain: string;
  headless: boolean;
  selectors: {
    researchKeywordInput: string;
    downloadCsvBtn: string;
    startKywResBtn: string;
    keywordsAppearedBox: string;
    keywordCells: string;
  };
  cookies: string[];
}

export interface UbersuggestConfigI {
  url: string;
  domain: string;
  headless: boolean;
  selectors: {
    researchKeywordInput: string;
    startKywResearchBtn: string;
    keywordResearchResAppearedSel: string;
    loginWithGoogleBtnSel: string;
    loggedInImgSel: string;
  };
  cookies: string[];
}
