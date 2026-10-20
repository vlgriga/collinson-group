import type { Clock, DailyWeather, ForecastFetcher, Location } from '../ranking/index.js';
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

  async fetch(location: Location, dates: readonly LocalDate[]): Promise<DailyWeather[]> {
    const { days, payload } = await this.#client.daily(location, dates);
    await this.#repository.saveFetch({
      locationId: location.id,
      days,
      payload,
      fetchedAt: this.#clock.now(),
    });
    return days;
  }
}
