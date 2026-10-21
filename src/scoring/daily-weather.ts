import type { LocalDate } from '../shared/index.js';

/** One day of a place's forecast, in the units the names carry; null where the forecast has none. */
export type DailyWeather = {
  date: LocalDate;
  precipitationMm: number | null;
  apparentTemperatureMaxC: number | null;
  sunshineDurationH: number | null;
  daylightDurationH: number | null;
  windSpeedMaxKmh: number | null;
  uvIndexMax: number | null;
  /** WMO weather interpretation code. */
  weatherCode: number | null;
  /** The deepest the snow on the ground is in any hour of the day. */
  snowDepthMaxCm: number | null;
};

/** How good a day is for an activity, 0–100, and what decided it. */
export type DayScore = {
  score: number;
  reasons: string[];
};
