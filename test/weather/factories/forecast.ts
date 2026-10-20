import { asc } from 'drizzle-orm';

import { dailyWeather, forecastFetches, type Database } from '../../../src/db/index.js';

/** Every stored day, in date order. */
export function readDailyWeather(db: Database) {
  return db.select().from(dailyWeather).orderBy(asc(dailyWeather.date));
}

export function readForecastFetches(db: Database) {
  return db.select().from(forecastFetches);
}
