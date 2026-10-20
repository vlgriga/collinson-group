import type { DailyWeather, ForecastFetcher, Location } from '../ranking/index.js';
import type { LocalDate } from '../shared/index.js';
import type { ForecastClient } from './forecast-client.js';

/** Fetches a place's forecast from Open-Meteo. */
export class ForecastService implements ForecastFetcher {
  readonly #client: ForecastClient;

  constructor({ client }: { client: ForecastClient }) {
    this.#client = client;
  }

  fetch(location: Location, dates: readonly LocalDate[]): Promise<DailyWeather[]> {
    return this.#client.daily(location, dates);
  }
}
