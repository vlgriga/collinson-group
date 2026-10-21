import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { dailyWeather, forecastFetches, type Database } from '../db/index.js';
import type { DailyWeather, ForecastReader, Location, StoredForecast } from '../ranking/index.js';
import type { LocalDate } from '../shared/index.js';

/** The columns a DailyWeather is read from. */
const DAY = {
  date: dailyWeather.date,
  precipitationMm: dailyWeather.precipitationMm,
  apparentTemperatureMaxC: dailyWeather.apparentTemperatureMaxC,
  sunshineDurationH: dailyWeather.sunshineDurationH,
  daylightDurationH: dailyWeather.daylightDurationH,
  windSpeedMaxKmh: dailyWeather.windSpeedMaxKmh,
  uvIndexMax: dailyWeather.uvIndexMax,
  weatherCode: dailyWeather.weatherCode,
};

export type ForecastFetch = {
  locationId: string;
  days: readonly DailyWeather[];
  payload: unknown;
  fetchedAt: Date;
};

/** The stored days of each place, and the fetches they came from. */
export class ForecastRepository implements ForecastReader {
  readonly #db: Database;

  constructor({ db }: { db: Database }) {
    this.#db = db;
  }

  async read(location: Location, dates: readonly LocalDate[]): Promise<StoredForecast | undefined> {
    const latestFetch = this.#db
      .select({ fetchedAt: forecastFetches.fetchedAt })
      .from(forecastFetches)
      .where(
        and(
          eq(forecastFetches.locationId, location.id),
          eq(forecastFetches.source, 'FORECAST'),
          eq(forecastFetches.status, 'SUCCEEDED'),
        ),
      )
      .orderBy(desc(forecastFetches.fetchedAt))
      .limit(1)
      .as('latest_fetch');
    // One statement, so that the days and the fetch time are read from the same state.
    const rows = await this.#db
      .select({ day: DAY, fetchedAt: latestFetch.fetchedAt })
      .from(dailyWeather)
      .innerJoin(latestFetch, sql`true`)
      .where(and(eq(dailyWeather.locationId, location.id), inArray(dailyWeather.date, [...dates])))
      .orderBy(asc(dailyWeather.date));
    const [first] = rows;
    return first === undefined
      ? undefined
      : { days: rows.map(({ day }) => day), fetchedAt: first.fetchedAt };
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
