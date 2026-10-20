import { z } from 'zod';

import type { DailyWeather, Location } from '../ranking/index.js';
import { getJson, type LocalDate } from '../shared/index.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const SECONDS_PER_HOUR = 3600;

/** A value per date; a single one may be missing. */
const SERIES = z.array(z.number().nullable());

const DAILY = z.object({
  // Validated, then trusted as a date of the place's calendar (ADR 0009).
  time: z.array(z.iso.date().transform((date) => date as LocalDate)),
  precipitation_sum: SERIES,
  apparent_temperature_max: SERIES,
  sunshine_duration: SERIES,
  daylight_duration: SERIES,
  wind_speed_10m_max: SERIES,
  uv_index_max: SERIES,
  weather_code: z.array(z.int().nullable()),
});

// Asked for by the names the response is checked against, so the two cannot drift apart.
const DAILY_VARIABLES = Object.keys(DAILY.shape).filter((key) => key !== 'time');

const RESPONSE = z.object({
  daily: DAILY.refine(
    ({ time, ...series }) => Object.values(series).every((values) => values.length === time.length),
    'Every daily variable has one value per date',
  ),
});

export type Forecast = {
  days: DailyWeather[];
  /** The response as Open-Meteo sent it, kept with the fetch. */
  payload: unknown;
};

/** Open-Meteo Forecast: a place's daily weather, converted to the units its names carry. */
export class ForecastClient {
  async daily(location: Location, dates: readonly LocalDate[]): Promise<Forecast> {
    const [first] = dates;
    const last = dates.at(-1);
    if (first === undefined || last === undefined) {
      throw new Error('A forecast is asked for at least one date');
    }
    const url = new URL(FORECAST_URL);
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      daily: DAILY_VARIABLES.join(','),
      timezone: location.timezone,
      start_date: first,
      end_date: last,
    }).toString();
    const payload = await getJson(url);
    const { daily } = RESPONSE.parse(payload);
    const days = daily.time.map((date, day) => ({
      date,
      precipitationMm: daily.precipitation_sum[day] ?? null,
      apparentTemperatureMaxC: daily.apparent_temperature_max[day] ?? null,
      sunshineDurationH: hours(daily.sunshine_duration[day]),
      daylightDurationH: hours(daily.daylight_duration[day]),
      windSpeedMaxKmh: daily.wind_speed_10m_max[day] ?? null,
      uvIndexMax: daily.uv_index_max[day] ?? null,
      weatherCode: daily.weather_code[day] ?? null,
    }));
    return { days, payload };
  }
}

function hours(seconds: number | null | undefined): number | null {
  return seconds == null ? null : seconds / SECONDS_PER_HOUR;
}
