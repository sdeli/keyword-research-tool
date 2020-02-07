export class UbersuggestAnaliticsParams {
  analiticsScrapeSessionId: string;
  suggestionsScrapeId: string;

  constructor(conf: UbersuggestAnaliticsParams) {
    Object.assign(this, conf);
  }
}

export class KeywordIoScraperParams {
  suggestionsScrapeSessionId: string;
  keyword: string;

  constructor(conf: KeywordIoScraperParams) {
    Object.assign(this, conf);
  }
}
