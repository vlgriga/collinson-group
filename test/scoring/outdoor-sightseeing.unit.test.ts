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
    expect(reasons).toEqual([
      'Heavy rain or snow',
      '12.0 mm of precipitation',
      'Feels like 20 °C',
    ]);
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

  it('gives as reasons the three weightiest factors when none costs a point', () => {
    // Given
    const day = buildDay(IDEAL);

    // When
    const { reasons } = scoreOutdoorSightseeing(day);

    // Then
    expect(reasons).toEqual(['No precipitation', 'Feels like 20 °C', 'Sunshine 50% of daylight']);
  });
});
