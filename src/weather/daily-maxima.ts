import type { LocalDate } from '../shared/index.js';

/** An hourly variable as Open-Meteo sends it: a value per hour, at the local time beside it. */
export type Hourly = {
  /** YYYY-MM-DDTHH:MM, in the place's timezone. */
  time: readonly string[];
  values: readonly (number | null)[];
};

/** The date of the place's calendar an hour's local time falls on. */
export function dateOf(time: string): string {
  return time.slice(0, 'YYYY-MM-DD'.length);
}

/** Each date's highest hourly value; null for a date none of whose hours has one. */
export function dailyMaxima(
  dates: readonly LocalDate[],
  { time, values }: Hourly,
): (number | null)[] {
  const maxima = new Map<string, number>();
  values.forEach((value, hour) => {
    const at = time[hour];
    if (value === null || at === undefined) {
      return;
    }
    const date = dateOf(at);
    maxima.set(date, Math.max(maxima.get(date) ?? value, value));
  });
  return dates.map((date) => maxima.get(date) ?? null);
}
