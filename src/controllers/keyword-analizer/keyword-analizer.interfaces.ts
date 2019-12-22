export interface KeywordAnalizerConfigI {
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
