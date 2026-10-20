// The seams the use case needs, implemented outside this module (docs/architecture/ports.md).

import type { DailyWeather } from '../scoring/index.js';
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
};

/** Turns the name a client sent, and the country it may be limited to, into one place. */
export interface LocationResolver {
  resolve(request: { city: string; countryCode: string | null }): Promise<Location>;
}

/** Fetches a place's forecast now. */
export interface ForecastFetcher {
  /** The days of `dates`, in date order. */
  fetch(location: Location, dates: readonly LocalDate[]): Promise<DailyWeather[]>;
}
