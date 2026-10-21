import type { LocalDate } from '../shared/index.js';

/** An hourly variable as Open-Meteo sends it: a value per hour, at the local time beside it. */
export type Hourly = {
  /** YYYY-MM-DDTHH:MM, in the place's timezone. */
  time: readonly string[];
  values: readonly (number | null)[];
};

/** Each date's highest hourly value; null for a date none of whose hours has one. */
export function dailyMaxima(
  dates: readonly LocalDate[],
  { time, values }: Hourly,
): (number | null)[] {
  return dates.map((date) => {
    const day = values.filter(
      (value, hour): value is number =>
        value !== null && time[hour]?.startsWith(`${date}T`) === true,
    );
    return day.length === 0 ? null : Math.max(...day);
  });
}
