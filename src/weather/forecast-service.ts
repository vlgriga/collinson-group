import type { Clock, ForecastFetcher, Location, StoredForecast } from '../ranking/index.js';
import type { LocalDate } from '../shared/index.js';
import type { ForecastClient } from './forecast-client.js';
import type { ForecastRepository } from './forecast-repository.js';
import type { MarineClient } from './marine-client.js';

/** Fetches a place's forecast and its sea's from Open-Meteo, and stores them. */
export class ForecastService implements ForecastFetcher {
  readonly #forecastClient: ForecastClient;
  readonly #marineClient: MarineClient;
  readonly #repository: ForecastRepository;
  readonly #clock: Clock;

  constructor(dependencies: {
    forecastClient: ForecastClient;
    marineClient: MarineClient;
    repository: ForecastRepository;
    clock: Clock;
  }) {
    this.#forecastClient = dependencies.forecastClient;
    this.#marineClient = dependencies.marineClient;
    this.#repository = dependencies.repository;
    this.#clock = dependencies.clock;
  }

  async fetch(location: Location, dates: readonly LocalDate[]): Promise<StoredForecast> {
    const [{ days, payload }, marine] = await Promise.all([
      this.#forecastClient.daily(location, dates),
      this.#marineClient.daily(location, dates),
    ]);
    const fetchedAt = this.#clock.now();
    await this.#repository.saveFetch({ locationId: location.id, days, payload, marine, fetchedAt });
    // What was just stored, rather than read back.
    return { days, fetchedAt };
  }
}
