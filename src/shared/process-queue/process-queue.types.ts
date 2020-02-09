import { supportedLanguages } from '@keyword-analizer/keyword-analizer.types';

// tslint:disable: max-classes-per-file
export class UbersuggestAnaliticsParams {
  analiticsScrapeSessionId: string;
  suggestionsScrapeId: string;
  lang: supportedLanguages;

  constructor(conf: UbersuggestAnaliticsParams) {
    Object.assign(this, conf);
  }
}

export class KeywordIoScraperParams {
  suggestionsScrapeSessionId: string;
  keyword: string;
  lang: supportedLanguages;

  constructor(conf: KeywordIoScraperParams) {
    Object.assign(this, conf);
  }
}
