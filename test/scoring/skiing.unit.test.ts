import { describe, expect, it } from 'vitest';

import { scoreSkiing } from '../../src/scoring/index.js';
import { buildDay } from './factories/day.js';

/** Every factor in its comfort band: the day the other cases change one thing about. */
const IDEAL = {
  snowDepthMaxCm: 150,
  snowfallCm: 15,
  temperatureMaxC: -5,
  windGustsMaxKmh: 10,
  sunshineDurationH: 5,
  daylightDurationH: 10,
} as const;

describe('scoreSkiing', () => {
  it('scores 100 on a day of deep and fresh snow, frost, calm and sun for half of it', () => {
    // Given
    const day = buildDay(IDEAL);

    // When
    const { score } = scoreSkiing(day);

    // Then
    expect(score).toBe(100);
  });

  it('scores 0 on a day of thin snow, none fresh, a thaw, strong gusts and no sun, short of every cap', () => {
    // Given
    const day = buildDay({
      snowDepthMaxCm: 10,
      snowfallCm: 0,
      temperatureMaxC: 15,
      windGustsMaxKmh: 60,
      sunshineDurationH: 0,
      daylightDurationH: 10,
    });

    // When
    const { score } = scoreSkiing(day);

    // Then
    expect(score).toBe(0);
  });

  it.each([
    { change: '10 cm of snow on the ground', day: { snowDepthMaxCm: 10 }, score: 60 },
    { change: '55 cm of snow on the ground', day: { snowDepthMaxCm: 55 }, score: 80 },
    { change: '100 cm of snow on the ground', day: { snowDepthMaxCm: 100 }, score: 100 },
    { change: '150 cm of snow on the ground', day: { snowDepthMaxCm: 150 }, score: 100 },
    { change: 'no fresh snow', day: { snowfallCm: 0 }, score: 80 },
    { change: '5 cm of fresh snow', day: { snowfallCm: 5 }, score: 90 },
    { change: '10 cm of fresh snow', day: { snowfallCm: 10 }, score: 100 },
    { change: '30 cm of fresh snow', day: { snowfallCm: 30 }, score: 100 },
    { change: 'a high of -25 °C', day: { temperatureMaxC: -25 }, score: 85 },
    { change: 'a high of -20 °C', day: { temperatureMaxC: -20 }, score: 85 },
    { change: 'a high of -16 °C', day: { temperatureMaxC: -16 }, score: 91 },
    { change: 'a high of -10 °C', day: { temperatureMaxC: -10 }, score: 100 },
    { change: 'a high of 0 °C', day: { temperatureMaxC: 0 }, score: 100 },
    { change: 'a high of 4 °C', day: { temperatureMaxC: 4 }, score: 94 },
    { change: 'a high of 10 °C', day: { temperatureMaxC: 10 }, score: 85 },
    { change: 'a high of 15 °C', day: { temperatureMaxC: 15 }, score: 85 },
    { change: 'gusts up to 30 km/h', day: { windGustsMaxKmh: 30 }, score: 100 },
    { change: 'gusts up to 40 km/h', day: { windGustsMaxKmh: 40 }, score: 95 },
    { change: 'gusts up to 60 km/h', day: { windGustsMaxKmh: 60 }, score: 85 },
    { change: 'no sunshine', day: { sunshineDurationH: 0 }, score: 90 },
    { change: 'sunshine for 25% of daylight', day: { sunshineDurationH: 2.5 }, score: 95 },
    { change: 'sunshine for 50% of daylight', day: { sunshineDurationH: 5 }, score: 100 },
    { change: 'sunshine for 90% of daylight', day: { sunshineDurationH: 9 }, score: 100 },
  ] as const)('scores $score on an otherwise ideal day with $change', ({ day, score }) => {
    // Given
    const changed = buildDay({ ...IDEAL, ...day });

    // When
    const scored = scoreSkiing(changed);

    // Then
    expect(scored.score).toBe(score);
  });

  it('counts a day without daylight as one without sunshine', () => {
    // Given
    const day = buildDay({ ...IDEAL, sunshineDurationH: 0, daylightDurationH: 0 });

    // When
    const { score } = scoreSkiing(day);

    // Then
    expect(score).toBe(90);
  });
});
