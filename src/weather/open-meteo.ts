// What the Forecast and Marine clients share: how a place's dates are asked for, and how the days
// of the answer are read.
import { z } from 'zod';

import type { Location } from '../ranking/index.js';
import type { LocalDate } from '../shared/index.js';

/** A value per date, or per hour; a single one may be missing. */
export const SERIES = z.array(z.number().nullable());

/** The dates of the days: validated, then trusted as dates of the place's calendar (ADR 0009). */
export const DATES = z.array(z.iso.date().transform((date) => date as LocalDate));

/** Whether every variable has one value per time. */
export function aligned({
  time,
  ...series
}: { time: readonly unknown[] } & Record<string, readonly unknown[]>): boolean {
  return Object.values(series).every((values) => values.length === time.length);
}

/** `endpoint`, asking for `variables` at the place on `dates`, in its timezone (ADR 0009). */
export function urlFor(
  endpoint: string,
  location: Location,
  dates: readonly LocalDate[],
  variables: Record<string, string>,
): URL {
  const [first] = dates;
  const last = dates.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error('A forecast is asked for at least one date');
  }
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    ...variables,
    timezone: location.timezone,
    start_date: first,
    end_date: last,
  }).toString();
  return url;
}
