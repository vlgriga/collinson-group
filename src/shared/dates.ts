/** A calendar day, YYYY-MM-DD, in the timezone of the place it belongs to; never a JS Date. */
export type LocalDate = string & { readonly brand: 'LocalDate' };

/** Today and the six days after it: "the next 7 days" of the requirements. */
export const WEEK_DAYS = 7;

/** Whether `dates` are `expected`, one each and in the same order. */
export function sameDates(dates: readonly string[], expected: readonly string[]): boolean {
  return dates.length === expected.length && dates.every((date, day) => date === expected[day]);
}

/** The week from today in `timezone`, today being the date it is there at `instant`. */
export function localWeek(instant: Date, timezone: string): LocalDate[] {
  // Read part by part, so that no locale's date pattern is relied on.
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instant);
  const part = (type: 'year' | 'month' | 'day'): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  // Calendar arithmetic in UTC, where every day is 24 hours long; Date.UTC carries a day past
  // the end of a month into the next.
  return Array.from({ length: WEEK_DAYS }, (_, offset) => {
    const day = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + offset));
    return day.toISOString().slice(0, 'YYYY-MM-DD'.length) as LocalDate;
  });
}
