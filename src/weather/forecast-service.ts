import type { Clock, ForecastFetcher, Location, StoredForecast } from '../ranking/index.js';
import type { LocalDate } from '../shared/index.js';
import type { ForecastClient } from './forecast-client.js';
import type { ForecastRepository } from './forecast-repository.js';

/** Fetches a place's forecast from Open-Meteo and stores it. */
export class ForecastService implements ForecastFetcher {
  readonly #client: ForecastClient;
  readonly #repository: ForecastRepository;
  readonly #clock: Clock;

  constructor(dependencies: {
    client: ForecastClient;
    repository: ForecastRepository;
    clock: Clock;
  }) {
    this.#client = dependencies.client;
    this.#repository = dependencies.repository;
    this.#clock = dependencies.clock;
  }

  async fetch(location: Location, dates: readonly LocalDate[]): Promise<StoredForecast> {
    const { days, payload } = await this.#client.daily(location, dates);
    const fetchedAt = this.#clock.now();
    await this.#repository.saveFetch({ locationId: location.id, days, payload, fetchedAt });
    // What was just stored, rather than read back.
    return { days, fetchedAt };
  }
}
