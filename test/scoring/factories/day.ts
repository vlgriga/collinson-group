import type { DailyWeather } from '../../../src/scoring/index.js';
import type { LocalDate } from '../../../src/shared/index.js';

/**
 * Every outdoor sightseeing factor in its comfort band: the day the other cases change one thing
 * about.
 */
export const IDEAL_OUTDOOR_DAY = {
  precipitationMm: 0,
  apparentTemperatureMaxC: 20,
  sunshineDurationH: 5,
  daylightDurationH: 10,
  windSpeedMaxKmh: 10,
  uvIndexMax: 3,
  weatherCode: 1,
} as const;

/** The ideal outdoor day, without snow, to be overridden by what a test is about. */
export function buildDay(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    date: '2026-10-18' as LocalDate,
    ...IDEAL_OUTDOOR_DAY,
    snowDepthMaxCm: 0,
    snowfallCm: 0,
    temperatureMaxC: 21,
    windGustsMaxKmh: 20,
    ...overrides,
  };
}
