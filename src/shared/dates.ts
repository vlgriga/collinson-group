/** A calendar day, YYYY-MM-DD, in the timezone of the place it belongs to; never a JS Date. */
export type LocalDate = string & { readonly brand: 'LocalDate' };

/** Today and the six days after it: "the next 7 days" of the requirements. */
const WEEK_DAYS = 7;

// en-CA writes a date as YYYY-MM-DD.
const ISO_DATE_LOCALE = 'en-CA';

/** The week from today in `timezone`, today being the date it is there at `instant`. */
export function localWeek(instant: Date, timezone: string): LocalDate[] {
  const today = new Intl.DateTimeFormat(ISO_DATE_LOCALE, { timeZone: timezone }).format(instant);
  // Calendar arithmetic in UTC, where every day is 24 hours long.
  const first = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: WEEK_DAYS }, (_, offset) => {
    const day = new Date(first);
    day.setUTCDate(first.getUTCDate() + offset);
    return day.toISOString().slice(0, 'YYYY-MM-DD'.length) as LocalDate;
  });
}
