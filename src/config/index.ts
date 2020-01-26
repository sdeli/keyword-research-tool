const { CAPTCHA_2D_TOKEN } = process.env;

const globalConfigs = {
  headless: true,
  captcha2dToken: CAPTCHA_2D_TOKEN,
  captcha2dId: '2captcha',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
  downloadsFolder: `${process.cwd()}/src/assets/downloads`,
  userDataFolder: `${process.cwd()}/src/assets/user-data`,
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
      downloadCsvBtnSel: '#edit-export-csv--4',
      startKywResBtn: '#edit-submit--4',
      keywordsAppearedSel: '#kt-keywords-search-results-form h4.search-results-title',
    },
    cookies: [],
  },
  ubersuggest: {
    headless: globalConfigs.headless,
    url: 'https://app.neilpatel.com/en/ubersuggest/keyword_ideas?keyword=gyerek%20játékok&locId=2348&lang=hu',
    domain: 'https://app.neilpatel.com',
    selectors: {
      researchKeywordInput: '[placeholder="Enter in a keyword or domain"]',
      loginWithGoogleBtnSel: '[data-for="register-tooltip"]',
      loggedInImgSel: 'img[alt="user-pic"]',
      keywordResearchResAppearedSel: '[data-for="tooltip-kidea-0"]',
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
