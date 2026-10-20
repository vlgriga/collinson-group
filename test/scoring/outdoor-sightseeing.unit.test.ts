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
});
