import { asc, eq } from 'drizzle-orm';

import { dailyWeather, forecastFetches, type Database } from '../../../src/db/index.js';
import type { LocalDate } from '../../../src/shared/index.js';

/** Every stored day, in date order. */
export function readDailyWeather(db: Database) {
  return db.select().from(dailyWeather).orderBy(asc(dailyWeather.date));
}

export function readForecastFetches(db: Database) {
  return db.select().from(forecastFetches);
}

/** Removes the stored day of `date`, of every place, as if no fetch had stored it. */
export async function storeDayMissing(db: Database, date: string): Promise<void> {
  await db.delete(dailyWeather).where(eq(dailyWeather.date, date as LocalDate));
}
