import { describe, expect, it } from 'vitest';

import { scoreOutdoorSightseeing } from '../../src/scoring/index.js';
import { buildDay } from './factories/day.js';

/** Every factor in its comfort band: the day the other cases change one thing about. */
const IDEAL = {
  precipitationMm: 0,
  apparentTemperatureMaxC: 20,
  sunshineDurationH: 5,
  daylightDurationH: 10,
  windSpeedMaxKmh: 10,
  uvIndexMax: 3,
  weatherCode: 1,
} as const;

describe('scoreOutdoorSightseeing', () => {
  it('scores 100 on a dry, mild, half-sunny, calm day with moderate UV', () => {
    // Given
    const day = buildDay(IDEAL);

    // When
    const { score } = scoreOutdoorSightseeing(day);

    // Then
    expect(score).toBe(100);
  });

  it('scores 0 on a wet, freezing, sunless, stormy day with extreme UV, short of every cap', () => {
    // Given
    const day = buildDay({
      precipitationMm: 9,
      apparentTemperatureMaxC: -5,
      sunshineDurationH: 0,
      daylightDurationH: 10,
      windSpeedMaxKmh: 60,
      uvIndexMax: 12,
      weatherCode: 63,
    });

    // When
    const { score } = scoreOutdoorSightseeing(day);

    // Then
    expect(score).toBe(0);
  });

  it.each([
    { change: '0.5 mm of precipitation', day: { precipitationMm: 0.5 }, score: 100 },
    { change: '1.4 mm of precipitation', day: { precipitationMm: 1.4 }, score: 93 },
    { change: '5 mm of precipitation', day: { precipitationMm: 5 }, score: 65 },
    { change: '8 mm of precipitation', day: { precipitationMm: 8 }, score: 65 },
    { change: 'a feel of -5 °C', day: { apparentTemperatureMaxC: -5 }, score: 75 },
    { change: 'a feel of 0 °C', day: { apparentTemperatureMaxC: 0 }, score: 75 },
    { change: 'a feel of 6 °C', day: { apparentTemperatureMaxC: 6 }, score: 85 },
    { change: 'a feel of 15 °C', day: { apparentTemperatureMaxC: 15 }, score: 100 },
    { change: 'a feel of 25 °C', day: { apparentTemperatureMaxC: 25 }, score: 100 },
    { change: 'a feel of 31 °C', day: { apparentTemperatureMaxC: 31 }, score: 85 },
    { change: 'a feel of 35 °C', day: { apparentTemperatureMaxC: 35 }, score: 75 },
    { change: 'a feel of 40 °C', day: { apparentTemperatureMaxC: 40 }, score: 75 },
    { change: 'no sunshine', day: { sunshineDurationH: 0 }, score: 80 },
    { change: 'sunshine for 25% of daylight', day: { sunshineDurationH: 2.5 }, score: 90 },
    { change: 'sunshine for 50% of daylight', day: { sunshineDurationH: 5 }, score: 100 },
    { change: 'sunshine for 90% of daylight', day: { sunshineDurationH: 9 }, score: 100 },
    { change: 'wind up to 20 km/h', day: { windSpeedMaxKmh: 20 }, score: 100 },
    { change: 'wind up to 35 km/h', day: { windSpeedMaxKmh: 35 }, score: 95 },
    { change: 'wind up to 50 km/h', day: { windSpeedMaxKmh: 50 }, score: 90 },
    { change: 'wind up to 70 km/h', day: { windSpeedMaxKmh: 70 }, score: 90 },
    { change: 'UV index 5', day: { uvIndexMax: 5 }, score: 100 },
    { change: 'UV index 8', day: { uvIndexMax: 8 }, score: 95 },
    { change: 'UV index 11', day: { uvIndexMax: 11 }, score: 90 },
    { change: 'UV index 13', day: { uvIndexMax: 13 }, score: 90 },
  ] as const)('scores $score on an otherwise ideal day with $change', ({ day, score }) => {
    // Given
    const changed = buildDay({ ...IDEAL, ...day });

    // When
    const scored = scoreOutdoorSightseeing(changed);

    // Then
    expect(scored.score).toBe(score);
  });

  it('counts a day without daylight as one without sunshine', () => {
    // Given
    const day = buildDay({ ...IDEAL, sunshineDurationH: 0, daylightDurationH: 0 });

    // When
    const { score } = scoreOutdoorSightseeing(day);

    // Then
    expect(score).toBe(80);
  });

  it.each([95, 96, 99] as const)(
    'caps the day at 10 in a thunderstorm (weather code %i)',
    (weatherCode) => {
      // Given
      const day = buildDay({ ...IDEAL, weatherCode });

      // When
      const { score } = scoreOutdoorSightseeing(day);

      // Then
      expect(score).toBe(10);
    },
  );

  it('leads the reasons with a thunderstorm', () => {
    // Given
    const day = buildDay({ ...IDEAL, weatherCode: 95 });

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toEqual(['Thunderstorm', 'No precipitation', 'Feels like 20 °C']);
  });

  it('caps the day at 20 from 10 mm of precipitation', () => {
    // Given
    const day = buildDay({ ...IDEAL, precipitationMm: 10 });

    // When
    const { score } = scoreOutdoorSightseeing(day);

    // Then
    expect(score).toBe(20);
  });

  it('does not cap the day at 9.9 mm of precipitation', () => {
    // Given
    const day = buildDay({ ...IDEAL, precipitationMm: 9.9 });

    // When
    const { score } = scoreOutdoorSightseeing(day);

    // Then
    expect(score).toBe(65);
  });

  it('leads the reasons with heavy rain or snow', () => {
    // Given
    const day = buildDay({ ...IDEAL, precipitationMm: 12 });

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toEqual(['Heavy rain or snow', '12.0 mm of precipitation', 'Feels like 20 °C']);
  });

  it.each([
    { field: 'precipitationMm', reason: 'Precipitation missing from the forecast' },
    { field: 'weatherCode', reason: 'Weather code missing from the forecast' },
  ] as const)('scores 0 when a cap needs the missing $field, naming it', ({ field, reason }) => {
    // Given
    const day = buildDay({ ...IDEAL, [field]: null });

    // When
    const scored = scoreOutdoorSightseeing(day);

    // Then
    expect(scored).toEqual({ score: 0, reasons: [reason] });
  });

  it.each([
    { field: 'apparentTemperatureMaxC', score: 73 },
    { field: 'sunshineDurationH', score: 75 },
    { field: 'daylightDurationH', score: 75 },
    { field: 'windSpeedMaxKmh', score: 89 },
    { field: 'uvIndexMax', score: 89 },
  ] as const)('leaves out a missing $field and rescales the other weights', ({ field, score }) => {
    // Given a day of 80 with every factor: a gale and extreme UV cost 10 points each
    const day = buildDay({ ...IDEAL, windSpeedMaxKmh: 50, uvIndexMax: 11, [field]: null });

    // When
    const scored = scoreOutdoorSightseeing(day);

    // Then
    expect(scored.score).toBe(score);
  });

  it('gives as reasons the three factors that cost the most points, the costliest first', () => {
    // Given
    const day = buildDay({
      ...IDEAL,
      apparentTemperatureMaxC: 0,
      sunshineDurationH: 0,
      windSpeedMaxKmh: 35,
    });

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toEqual(['Feels like 0 °C', 'Sunshine 0% of daylight', 'Wind up to 35 km/h']);
  });

  it('gives precipitation that rounds to nothing as none', () => {
    // Given
    const day = buildDay({ ...IDEAL, precipitationMm: 0.03 });

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toContain('No precipitation');
  });

  it('gives sunshine beyond the daylight as 100% of it', () => {
    // Given
    const day = buildDay({ ...IDEAL, sunshineDurationH: 10.3, daylightDurationH: 10 });

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toContain('Sunshine 100% of daylight');
  });

  it('gives a feel just below freezing as 0 °C, without a sign', () => {
    // Given
    const day = buildDay({ ...IDEAL, apparentTemperatureMaxC: -0.3 });

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toContain('Feels like 0 °C');
  });

  it('gives as reasons the three weightiest factors when none costs a point', () => {
    // Given
    const day = buildDay(IDEAL);

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toEqual(['No precipitation', 'Feels like 20 °C', 'Sunshine 50% of daylight']);
  });
});
