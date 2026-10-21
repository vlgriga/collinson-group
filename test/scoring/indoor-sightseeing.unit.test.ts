import { describe, expect, it } from 'vitest';

import { scoreIndoorSightseeing } from '../../src/scoring/index.js';
import { buildDay, IDEAL_OUTDOOR_DAY } from './factories/day.js';

describe('scoreIndoorSightseeing', () => {
  it('scores 50 on a perfect day outside', () => {
    // Given
    const day = buildDay(IDEAL_OUTDOOR_DAY);

    // When
    const { score } = scoreIndoorSightseeing(day);

    // Then
    expect(score).toBe(50);
  });

  it('scores 100 on a day outside that outdoor sightseeing scores 0, short of every cap', () => {
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
    const { score } = scoreIndoorSightseeing(day);

    // Then
    expect(score).toBe(100);
  });

  it.each([
    { change: 'no sunshine', outdoor: 80, day: { sunshineDurationH: 0 }, score: 60 },
    { change: 'a thunderstorm', outdoor: 10, day: { weatherCode: 95 }, score: 95 },
    { change: '10 mm of precipitation', outdoor: 20, day: { precipitationMm: 10 }, score: 90 },
  ] as const)(
    'scores $score, half way from 50 to 100 as outdoor scores $outdoor, on an otherwise perfect day with $change',
    ({ day, score }) => {
      // Given
      const changed = buildDay({ ...IDEAL_OUTDOOR_DAY, ...day });

      // When
      const scored = scoreIndoorSightseeing(changed);

      // Then
      expect(scored.score).toBe(score);
    },
  );

  it('rounds half up from the outdoor score the client sees', () => {
    // Given outdoor sightseeing's 93.3, which the client sees as 93
    const day = buildDay({ ...IDEAL_OUTDOOR_DAY, uvIndexMax: 9 });

    // When
    const { score } = scoreIndoorSightseeing(day);

    // Then
    // 53.5 from 93; 93.3 would have made it 53.
    expect(score).toBe(54);
  });

  it.each([
    { field: 'precipitationMm', reason: 'Outside: Precipitation missing from the forecast' },
    { field: 'weatherCode', reason: 'Outside: Weather code missing from the forecast' },
  ] as const)(
    'scores 50, not 100, when outdoor sightseeing cannot rate the day without $field, naming it',
    ({ field, reason }) => {
      // Given
      const day = buildDay({ ...IDEAL_OUTDOOR_DAY, [field]: null });

      // When
      const scored = scoreIndoorSightseeing(day);

      // Then
      expect(scored).toEqual({ score: 50, rated: false, reasons: [reason] });
    },
  );

  it("gives the outdoor day's reasons as what it is like outside", () => {
    // Given
    const day = buildDay({ ...IDEAL_OUTDOOR_DAY, weatherCode: 95 });

    // When
    const { reasons } = scoreIndoorSightseeing(day);

    // Then
    expect(reasons).toEqual([
      'Outside: Thunderstorm',
      'Outside: No precipitation',
      'Outside: Feels like 20 °C',
    ]);
  });
});
