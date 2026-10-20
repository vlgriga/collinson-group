import { sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

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

  /**
   * The days and the fetch they came from, together or not at all. A day already stored takes
   * the newer values (ADR 0005).
   */
  async saveFetch({ locationId, days, payload, fetchedAt }: ForecastFetch): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx
        .insert(dailyWeather)
        .values(days.map((day) => ({ locationId, ...day })))
        .onConflictDoUpdate({
          target: [dailyWeather.locationId, dailyWeather.date],
          set: {
            precipitationMm: excluded(dailyWeather.precipitationMm),
            apparentTemperatureMaxC: excluded(dailyWeather.apparentTemperatureMaxC),
            sunshineDurationH: excluded(dailyWeather.sunshineDurationH),
            daylightDurationH: excluded(dailyWeather.daylightDurationH),
            windSpeedMaxKmh: excluded(dailyWeather.windSpeedMaxKmh),
            uvIndexMax: excluded(dailyWeather.uvIndexMax),
            weatherCode: excluded(dailyWeather.weatherCode),
            updatedAt: sql`now()`,
          },
        });
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

/** The value the conflicting insert brought for `column`. */
function excluded(column: AnyPgColumn): SQL {
  return sql.raw(`excluded."${column.name}"`);
}
