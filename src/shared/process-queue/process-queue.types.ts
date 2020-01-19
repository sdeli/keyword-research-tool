export class UbersuggestAnaliticsParams {
  analiticsScrapeSessionId: string;
  suggestionsScrapeId: string;

  constructor(conf: UbersuggestAnaliticsParams) {
    Object.assign(this, conf);
  }
}
