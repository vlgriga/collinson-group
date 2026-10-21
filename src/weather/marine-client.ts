import { z } from 'zod';

import type { DailyMarine, Location } from '../ranking/index.js';
import { getJson, sameDates, type LocalDate } from '../shared/index.js';
import { aligned, DATES, SERIES, urlFor } from './open-meteo.js';

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

const DAILY = z.object({
  time: DATES,
  // In m and s, as the names say.
  wave_height_max: SERIES,
  swell_wave_period_max: SERIES,
});

// Asked for by the names the response is checked against, so the two cannot drift apart.
const DAILY_VARIABLES = Object.keys(DAILY.shape).filter((key) => key !== 'time');

const RESPONSE = z.object({
  daily: DAILY.refine(aligned, 'Every daily variable has one value per date'),
});

export type Marine = {
  /** Null when Marine has not a value for any of them: there is no sea at the place. */
  days: DailyMarine[] | null;
  /** The response as Open-Meteo sent it, kept with the fetch. */
  payload: unknown;
};

/** Open-Meteo Marine: the daily sea forecast at a place, where it has a sea. */
export class MarineClient {
  async daily(location: Location, dates: readonly LocalDate[]): Promise<Marine> {
    const url = urlFor(MARINE_URL, location, dates, { daily: DAILY_VARIABLES.join(',') });
    const {
      payload,
      data: { daily },
    } = await getJson(
      url,
      RESPONSE.refine(
        ({ daily }) => sameDates(daily.time, dates),
        `Expected the dates asked for: ${dates.join(', ')}`,
      ),
    );
    const days = daily.time.map((date, day) => ({
      date,
      waveHeightMaxM: daily.wave_height_max[day] ?? null,
      swellWavePeriodMaxS: daily.swell_wave_period_max[day] ?? null,
    }));
    // A point inland is answered, but with every value null (docs/design/activity-ranking.md).
    const hasSea = days.some(
      ({ waveHeightMaxM, swellWavePeriodMaxS }) =>
        waveHeightMaxM !== null || swellWavePeriodMaxS !== null,
    );
    return { days: hasSea ? days : null, payload };
  }
}
