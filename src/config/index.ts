const globalConfigs = {
  headless: false,
};

const localModulConfigurations = {
  KeywordIo: {
    headless: globalConfigs.headless,
    url:
      'https://keywordtool.io/search/keywords/google/43936310?category=web&keyword=gyerek%20j%C3%A1t%C3%A9kok&country=HU&language=hu#suggestions',
    domain: 'https://keywordtool.io/',
    selectors: {
      researchKeywordInput: '#edit-keyword--3',
      downloadCsvBtn: '#edit-export-csv--4',
      startKywResBtn: '#edit-submit--4',
      keywordsAppearedBox: '#search-1-wrapper .pro-upsell-table',
      keywordCells: '.col-keywords',
    },
    cookies: [],
  },
  utils: {
    cookiesFilePath: `${process.cwd()}/src/assets/cookies.json`,
    localStorageFilePath: `${process.cwd()}/src/assets/local-storage.json`,
    sessionFilePath: `${process.cwd()}/src/assets/session.json`,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
  },
};

export const config = Object.freeze(localModulConfigurations);
