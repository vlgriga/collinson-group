import { describe, expect, it } from 'vitest';

import { scoreSurfing } from '../../src/scoring/index.js';
import { buildSeaDay } from './factories/day.js';

/** Every factor in its comfort band: the day the other cases change one thing about. */
const IDEAL = {
  waveHeightMaxM: 1.5,
  swellWavePeriodMaxS: 12,
  windSpeedMaxKmh: 5,
  temperatureMaxC: 22,
  weatherCode: 1,
} as const;

describe('scoreSurfing', () => {
  it('scores 100 on a day of chest-high waves on a long swell, calm, and warm', () => {
    // Given
    const day = buildSeaDay(IDEAL);

    // When
    const { score } = scoreSurfing(day);

    // Then
    expect(score).toBe(100);
  });

  it('scores 0 on a day of ankle-high waves on a short swell, a fresh breeze and cold, short of every cap', () => {
    // Given
    const day = buildSeaDay({
      waveHeightMaxM: 0.3,
      swellWavePeriodMaxS: 6,
      windSpeedMaxKmh: 30,
      temperatureMaxC: 5,
      weatherCode: 3,
    });

    // When
    const { score } = scoreSurfing(day);

    // Then
    expect(score).toBe(0);
  });

  it.each([
    { change: 'waves up to 0.2 m', day: { waveHeightMaxM: 0.2 }, score: 65 },
    { change: 'waves up to 0.3 m', day: { waveHeightMaxM: 0.3 }, score: 65 },
    { change: 'waves up to 0.58 m', day: { waveHeightMaxM: 0.58 }, score: 79 },
    { change: 'waves up to 1 m', day: { waveHeightMaxM: 1 }, score: 100 },
    { change: 'waves up to 2.5 m', day: { waveHeightMaxM: 2.5 }, score: 100 },
    { change: 'waves up to 3.1 m', day: { waveHeightMaxM: 3.1 }, score: 86 },
    { change: 'waves up to 4 m', day: { waveHeightMaxM: 4 }, score: 65 },
    { change: 'a swell period of 5 s', day: { swellWavePeriodMaxS: 5 }, score: 70 },
    { change: 'a swell period of 6 s', day: { swellWavePeriodMaxS: 6 }, score: 70 },
    { change: 'a swell period of 9 s', day: { swellWavePeriodMaxS: 9 }, score: 85 },
    { change: 'a swell period of 12 s', day: { swellWavePeriodMaxS: 12 }, score: 100 },
    { change: 'a swell period of 16 s', day: { swellWavePeriodMaxS: 16 }, score: 100 },
    { change: 'wind up to 10 km/h', day: { windSpeedMaxKmh: 10 }, score: 100 },
    { change: 'wind up to 15 km/h', day: { windSpeedMaxKmh: 15 }, score: 94 },
    { change: 'wind up to 30 km/h', day: { windSpeedMaxKmh: 30 }, score: 75 },
    { change: 'wind up to 40 km/h', day: { windSpeedMaxKmh: 40 }, score: 75 },
    { change: 'a high of 0 °C', day: { temperatureMaxC: 0 }, score: 90 },
    { change: 'a high of 5 °C', day: { temperatureMaxC: 5 }, score: 90 },
    { change: 'a high of 12.5 °C', day: { temperatureMaxC: 12.5 }, score: 95 },
    { change: 'a high of 20 °C', day: { temperatureMaxC: 20 }, score: 100 },
    { change: 'a high of 30 °C', day: { temperatureMaxC: 30 }, score: 100 },
  ] as const)('scores $score on an otherwise ideal day with $change', ({ day, score }) => {
    // Given
    const changed = buildSeaDay({ ...IDEAL, ...day });

    // When
    const scored = scoreSurfing(changed);

    // Then
    expect(scored.score).toBe(score);
  });

  it('caps the day at 10 in waves over 4 m', () => {
    // Given
    const day = buildSeaDay({ ...IDEAL, waveHeightMaxM: 4.01 });

    // When
    const { score } = scoreSurfing(day);

    // Then
    expect(score).toBe(10);
  });

  it('leads the reasons with waves too big for all but experts', () => {
    // Given
    const day = buildSeaDay({ ...IDEAL, waveHeightMaxM: 5 });

    // When
    const { reasons } = scoreSurfing(day);

    // Then
    expect(reasons).toEqual([
      'Waves too big for all but experts',
      'Waves up to 5.0 m',
      'Swell period of 12 s',
    ]);
  });

  it.each([95, 96, 99])('caps the day at 0 in a thunderstorm, weather code %i', (weatherCode) => {
    // Given
    const day = buildSeaDay({ ...IDEAL, weatherCode });

    // When
    const { score } = scoreSurfing(day);

    // Then
    expect(score).toBe(0);
  });

  it('leads the reasons with the thunderstorm', () => {
    // Given
    const day = buildSeaDay({ ...IDEAL, weatherCode: 95 });

    // When
    const { reasons } = scoreSurfing(day);

    // Then
    expect(reasons).toEqual(['Thunderstorm', 'Waves up to 1.5 m', 'Swell period of 12 s']);
  });

  it.each([
    { field: 'waveHeightMaxM', reason: 'Wave height missing from the forecast' },
    { field: 'weatherCode', reason: 'Weather code missing from the forecast' },
  ] as const)('scores 0 when a cap needs the missing $field, naming it', ({ field, reason }) => {
    // Given
    const day = buildSeaDay({ ...IDEAL, [field]: null });

    // When
    const scored = scoreSurfing(day);

    // Then
    expect(scored).toEqual({ score: 0, rated: false, reasons: [reason] });
  });

  it.each([
    { field: 'swellWavePeriodMaxS', score: 70 },
    { field: 'windSpeedMaxKmh', score: 72 },
    { field: 'temperatureMaxC', score: 77 },
  ] as const)('leaves out a missing $field and rescales the other weights', ({ field, score }) => {
    // Given a day of 79 with every factor: 60% of the wave height's points are lost
    const day = buildSeaDay({ ...IDEAL, waveHeightMaxM: 0.58, [field]: null });

    // When
    const scored = scoreSurfing(day);

    // Then
    expect(scored.score).toBe(score);
  });

  it('gives as reasons the three factors that cost the most points, the costliest first', () => {
    // Given
    const day = buildSeaDay({
      ...IDEAL,
      swellWavePeriodMaxS: 9,
      windSpeedMaxKmh: 20,
      temperatureMaxC: 5,
    });

    // When
    const { reasons } = scoreSurfing(day);

    // Then
    expect(reasons).toEqual(['Swell period of 9 s', 'Wind up to 20 km/h', 'High of 5 °C']);
  });

  it('gives as reasons the three weightiest factors when none costs a point', () => {
    // Given
    const day = buildSeaDay(IDEAL);

    // When
    const { reasons } = scoreSurfing(day);

    // Then
    expect(reasons).toEqual(['Waves up to 1.5 m', 'Swell period of 12 s', 'Wind up to 5 km/h']);
  });

  it('gives waves just over the cap in tenths of a metre over it too', () => {
    // Given
    const day = buildSeaDay({ ...IDEAL, waveHeightMaxM: 4.03 });

    // When
    const { reasons } = scoreSurfing(day);

    // Then
    expect(reasons).toContain('Waves up to 4.1 m');
  });
});
