import { dailyWeather, forecastFetches, type Database } from '../db/index.js';
import type { DailyWeather } from '../ranking/index.js';

export type ForecastFetch = {
  locationId: string;
  days: readonly DailyWeather[];
  payload: unknown;
  fetchedAt: Date;
};

/** The stored days of each place, and the fetches they came from. */
export class ForecastRepository {
  readonly #db: Database;

  constructor({ db }: { db: Database }) {
    this.#db = db;
  }

  /** The days and the fetch they came from, together or not at all. */
  async saveFetch({ locationId, days, payload, fetchedAt }: ForecastFetch): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx.insert(dailyWeather).values(days.map((day) => ({ locationId, ...day })));
      await tx.insert(forecastFetches).values({
        locationId,
        source: 'FORECAST',
        status: 'SUCCEEDED',
        fetchedAt,
        rawPayload: payload,
      });
    });
  }
}
