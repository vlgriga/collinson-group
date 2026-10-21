import type { DailyWeather } from '../../../src/scoring/index.js';
import type { LocalDate } from '../../../src/shared/index.js';

/** A mild, dry, half-sunny and calm day, to be overridden by what a test is about. */
export function buildDay(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    date: '2026-10-18' as LocalDate,
    precipitationMm: 0,
    apparentTemperatureMaxC: 20,
    sunshineDurationH: 5,
    daylightDurationH: 10,
    windSpeedMaxKmh: 10,
    uvIndexMax: 3,
    weatherCode: 1,
    snowDepthMaxCm: 0,
    snowfallCm: 0,
    temperatureMaxC: 21,
    windGustsMaxKmh: 20,
    ...overrides,
  };
}
