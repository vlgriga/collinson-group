import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import {
  dailyMarine,
  dailyWeather,
  forecastFetches,
  locations,
  type Database,
} from '../db/index.js';
import type { DailyWeather, ForecastReader, Location, StoredForecast } from '../ranking/index.js';
import type { LocalDate } from '../shared/index.js';
import type { Marine } from './marine-client.js';

/** The columns of a DailyWeather's values, all but the date that keys them. */
const DAY_VALUES = {
  precipitationMm: dailyWeather.precipitationMm,
  apparentTemperatureMaxC: dailyWeather.apparentTemperatureMaxC,
  sunshineDurationH: dailyWeather.sunshineDurationH,
  daylightDurationH: dailyWeather.daylightDurationH,
  windSpeedMaxKmh: dailyWeather.windSpeedMaxKmh,
  uvIndexMax: dailyWeather.uvIndexMax,
  weatherCode: dailyWeather.weatherCode,
  snowDepthMaxCm: dailyWeather.snowDepthMaxCm,
  snowfallCm: dailyWeather.snowfallCm,
  temperatureMaxC: dailyWeather.temperatureMaxC,
  windGustsMaxKmh: dailyWeather.windGustsMaxKmh,
};

/** The columns a DailyWeather is read from. */
const DAY = { date: dailyWeather.date, ...DAY_VALUES };

export type ForecastFetch = {
  locationId: string;
  days: readonly DailyWeather[];
  payload: unknown;
  /** What Marine answered for the same dates. */
  marine: Marine;
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
   * The days, the sea's and the fetches they came from, together or not at all; and whether the
   * place has a sea, as Marine has just answered. A day already stored takes the newer values
   * (ADR 0005).
   */
  async saveFetch({ locationId, days, payload, marine, fetchedAt }: ForecastFetch): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx
        .insert(dailyWeather)
        .values(days.map((day) => ({ locationId, ...day })))
        .onConflictDoUpdate({
          target: [dailyWeather.locationId, dailyWeather.date],
          // Checked against what is read, so that no value read is left un-overwritten.
          set: {
            precipitationMm: excluded(dailyWeather.precipitationMm),
            apparentTemperatureMaxC: excluded(dailyWeather.apparentTemperatureMaxC),
            sunshineDurationH: excluded(dailyWeather.sunshineDurationH),
            daylightDurationH: excluded(dailyWeather.daylightDurationH),
            windSpeedMaxKmh: excluded(dailyWeather.windSpeedMaxKmh),
            uvIndexMax: excluded(dailyWeather.uvIndexMax),
            weatherCode: excluded(dailyWeather.weatherCode),
            snowDepthMaxCm: excluded(dailyWeather.snowDepthMaxCm),
            snowfallCm: excluded(dailyWeather.snowfallCm),
            temperatureMaxC: excluded(dailyWeather.temperatureMaxC),
            windGustsMaxKmh: excluded(dailyWeather.windGustsMaxKmh),
            updatedAt: sql`now()`,
          } satisfies Record<keyof typeof DAY_VALUES | 'updatedAt', SQL>,
        });
      await tx.insert(forecastFetches).values({
        locationId,
        source: 'FORECAST',
        status: 'SUCCEEDED',
        fetchedAt,
        rawPayload: payload,
      });
      if (marine.days !== null) {
        await tx
          .insert(dailyMarine)
          .values(marine.days.map((day) => ({ locationId, ...day })))
          .onConflictDoUpdate({
            target: [dailyMarine.locationId, dailyMarine.date],
            set: {
              waveHeightMaxM: excluded(dailyMarine.waveHeightMaxM),
              swellWavePeriodMaxS: excluded(dailyMarine.swellWavePeriodMaxS),
              updatedAt: sql`now()`,
            },
          });
      }
      await tx.insert(forecastFetches).values({
        locationId,
        source: 'MARINE',
        status: 'SUCCEEDED',
        fetchedAt,
        rawPayload: marine.payload,
      });
      await tx
        .update(locations)
        .set({ hasMarine: marine.days !== null, updatedAt: sql`now()` })
        .where(eq(locations.id, locationId));
    });
  }
}

/** The value the conflicting insert brought for `column`. */
function excluded(column: AnyPgColumn): SQL {
  return sql.raw(`excluded."${column.name}"`);
}
