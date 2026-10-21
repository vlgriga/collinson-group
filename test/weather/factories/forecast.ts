import { and, asc, eq } from 'drizzle-orm';

import {
  dailyMarine,
  dailyWeather,
  forecastFetches,
  type Database,
} from '../../../src/db/index.js';
import type { LocalDate } from '../../../src/shared/index.js';

/** Every stored day, in date order. */
export function readDailyWeather(db: Database) {
  return db.select().from(dailyWeather).orderBy(asc(dailyWeather.date));
}

/** Every stored day of a sea, in date order. */
export function readDailyMarine(db: Database) {
  return db.select().from(dailyMarine).orderBy(asc(dailyMarine.date));
}

export function readForecastFetches(db: Database) {
  return db.select().from(forecastFetches);
}

/** Removes the place's stored day of `date`, as if no fetch had stored it. */
export async function storeDayMissing(
  db: Database,
  location: { id: string },
  date: string,
): Promise<void> {
  await db
    .delete(dailyWeather)
    .where(and(eq(dailyWeather.locationId, location.id), eq(dailyWeather.date, date as LocalDate)));
}

/** Removes the place's stored day of the sea of `date`, as if no fetch had stored it. */
export async function storeMarineDayMissing(
  db: Database,
  location: { id: string },
  date: string,
): Promise<void> {
  await db
    .delete(dailyMarine)
    .where(and(eq(dailyMarine.locationId, location.id), eq(dailyMarine.date, date as LocalDate)));
}
