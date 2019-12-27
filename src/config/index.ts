const { CAPTCHA_2D_TOKEN } = process.env;
// console.log(process.env);
console.log(CAPTCHA_2D_TOKEN);
const globalConfigs = {
  headless: false,
  captcha2dToken: CAPTCHA_2D_TOKEN,
  captcha2dId: '2captcha',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
};

const localModulConfigurations = {
  global: globalConfigs,
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
  ubersuggest: {
    headless: globalConfigs.headless,
    url: 'https://app.neilpatel.com/en/ubersuggest/keyword_ideas?keyword=gyerek%20játékok&locId=2348&lang=hu',
    domain: 'https://app.neilpatel.com',
    selectors: {
      keywordResearchPageLoaded: '[alt="Logo"]',
      researchKeywordInput: '[placeholder="Enter in a keyword or domain"]',
      startKywResBtn: '#edit-submit--4',
      keywordsAppearedBox: '#search-1-wrapper .pro-upsell-table',
    },
    cookies: [],
  },
  utils: {
    cookiesFilePath: `${process.cwd()}/src/assets/cookies.json`,
    localStorageFilePath: `${process.cwd()}/src/assets/local-storage.json`,
    sessionFilePath: `${process.cwd()}/src/assets/session.json`,
  },
};

export const config = Object.freeze(localModulConfigurations);
