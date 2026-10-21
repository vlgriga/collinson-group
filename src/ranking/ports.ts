// The seams the use case needs, implemented outside this module (docs/architecture/ports.md).

import type { DailyMarine, DailyWeather } from '../scoring/index.js';
import type { LocalDate } from '../shared/index.js';

/** Says what time it is, so that "now" is the same instant for everything a request does. */
export interface Clock {
  now(): Date;
}

/** A city or town as the geocoder knows it, once stored. */
export type Location = {
  id: string;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  /** The first-level region, when the geocoder knows one. */
  admin1: string | null;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  /** IANA, such as Europe/Paris: the calendar the place's days are counted in. */
  timezone: string;
  /** Whether Marine forecasts a sea at the place; null until Marine has been asked. */
  hasMarine: boolean | null;
};

/** Turns the name a client sent, and the country it may be limited to, into one place. */
export interface LocationResolver {
  resolve(request: { city: string; countryCode: string | null }): Promise<Location>;
}

/** Days of a place's forecast as they are stored, and when the forecast was fetched. */
export type StoredForecast = {
  /** In date order. */
  days: DailyWeather[];
  /** The days of the place's sea, in date order; null for a place without a sea forecast. */
  marineDays: DailyMarine[] | null;
  /** The latest successful fetch of the place's forecast. */
  fetchedAt: Date;
};

/** Reads the days of a place's forecast that are stored. */
export interface ForecastReader {
  /** The stored days among `dates`; undefined when none of them is. */
  read(location: Location, dates: readonly LocalDate[]): Promise<StoredForecast | undefined>;
}

/** Fetches a place's forecast now, and stores it. */
export interface ForecastFetcher {
  /** The days of `dates`. */
  fetch(location: Location, dates: readonly LocalDate[]): Promise<StoredForecast>;
}
