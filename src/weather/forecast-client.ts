import { z } from 'zod';

import type { DailyWeather, Location } from '../ranking/index.js';
import { getJson, sameDates, type LocalDate } from '../shared/index.js';
import { dailyMaxima } from './daily-maxima.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const SECONDS_PER_HOUR = 3600;

const CM_PER_M = 100;

/** A value per date, or per hour; a single one may be missing. */
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

const HOURLY = z.object({
  // Local times of the place's calendar, such as 2026-10-18T09:00.
  time: z.array(z.iso.datetime({ local: true })),
  snow_depth: SERIES,
});

// Asked for by the names the response is checked against, so the two cannot drift apart.
const DAILY_VARIABLES = Object.keys(DAILY.shape).filter((key) => key !== 'time');
const HOURLY_VARIABLES = Object.keys(HOURLY.shape).filter((key) => key !== 'time');

const RESPONSE = z.object({
  daily: DAILY.refine(aligned, 'Every daily variable has one value per date'),
  hourly: HOURLY.refine(aligned, 'Every hourly variable has one value per hour'),
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
      hourly: HOURLY_VARIABLES.join(','),
      timezone: location.timezone,
      start_date: first,
      end_date: last,
    }).toString();
    const {
      payload,
      data: { daily, hourly },
    } = await getJson(
      url,
      // Other dates, such as a week without today just after midnight, would leave the week asked
      // for short (ADR 0009).
      RESPONSE.refine(
        ({ daily: { time } }) => sameDates(time, dates),
        `Expected the dates asked for: ${dates.join(', ')}`,
      ),
    );
    const snowDepthsM = dailyMaxima(daily.time, { time: hourly.time, values: hourly.snow_depth });
    const days = daily.time.map((date, day) => ({
      date,
      precipitationMm: daily.precipitation_sum[day] ?? null,
      apparentTemperatureMaxC: daily.apparent_temperature_max[day] ?? null,
      sunshineDurationH: hours(daily.sunshine_duration[day]),
      daylightDurationH: hours(daily.daylight_duration[day]),
      windSpeedMaxKmh: daily.wind_speed_10m_max[day] ?? null,
      uvIndexMax: daily.uv_index_max[day] ?? null,
      weatherCode: daily.weather_code[day] ?? null,
      snowDepthMaxCm: centimetres(snowDepthsM[day]),
    }));
    return { days, payload };
  }
}

/** Whether every variable has one value per time. */
function aligned({
  time,
  ...series
}: { time: readonly unknown[] } & Record<string, readonly unknown[]>): boolean {
  return Object.values(series).every((values) => values.length === time.length);
}

function hours(seconds: number | null | undefined): number | null {
  return seconds == null ? null : seconds / SECONDS_PER_HOUR;
}

function centimetres(metres: number | null | undefined): number | null {
  return metres == null ? null : metres * CM_PER_M;
}
