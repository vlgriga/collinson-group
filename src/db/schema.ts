// The tables, as docs/design/activity-ranking.md#data-model lays them out; `make migration`
// turns a change here into SQL.
import {
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { LocalDate } from '../shared/index.js';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

/** The places requests have resolved to, one per geocoder entry. */
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  geocodingId: integer('geocoding_id').notNull().unique(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  countryCode: text('country_code').notNull(),
  admin1: text('admin1'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  elevationM: doublePrecision('elevation_m'),
  timezone: text('timezone').notNull(),
  ...timestamps,
});

/** Each name a request gave, and the place it resolved to: the geocoding cache. */
export const locationAliases = pgTable(
  'location_aliases',
  {
    /** Trimmed, its spaces collapsed, lower-cased: the name as it was geocoded. */
    normalizedQuery: text('normalized_query').notNull(),
    /** '' when the search was not limited to a country, so that the key has no nulls. */
    countryCode: text('country_code').notNull(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.normalizedQuery, table.countryCode] }),
    // The names of a place, for the cascade when it is deleted.
    index('location_aliases_location_id_idx').on(table.locationId),
  ],
);

/** One row per place and date of its calendar, overwritten by each fetch (ADR 0005). */
export const dailyWeather = pgTable(
  'daily_weather',
  {
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).$type<LocalDate>().notNull(),
    precipitationMm: doublePrecision('precipitation_mm'),
    apparentTemperatureMaxC: doublePrecision('apparent_temperature_max_c'),
    sunshineDurationH: doublePrecision('sunshine_duration_h'),
    daylightDurationH: doublePrecision('daylight_duration_h'),
    windSpeedMaxKmh: doublePrecision('wind_speed_max_kmh'),
    uvIndexMax: doublePrecision('uv_index_max'),
    weatherCode: integer('weather_code'),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.locationId, table.date] })],
);

/** Every fetch from Open-Meteo, with what it answered. */
export const forecastFetches = pgTable(
  'forecast_fetches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    source: text('source', { enum: ['FORECAST'] }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: ['SUCCEEDED'] }).notNull(),
    rawPayload: jsonb('raw_payload').notNull(),
    ...timestamps,
  },
  // A place's fetches, latest first: what "when was it fetched" reads.
  (table) => [
    index('forecast_fetches_location_fetched_at_idx').on(table.locationId, table.fetchedAt),
  ],
);
