import { describe, expect, it } from 'vitest';

import type { LocalDate } from '../../src/shared/index.js';
import { dailyMaxima } from '../../src/weather/index.js';

describe('dailyMaxima', () => {
  it("takes the highest of each date's hours", () => {
    // Given
    const dates = ['2026-10-18', '2026-10-19'] as LocalDate[];
    const hourly = {
      time: ['2026-10-18T00:00', '2026-10-18T01:00', '2026-10-19T00:00', '2026-10-19T01:00'],
      values: [0.1, 0.3, 0.2, 0.05],
    };

    // When
    const maxima = dailyMaxima(dates, hourly);

    // Then
    expect(maxima).toEqual([0.3, 0.2]);
  });

  it('leaves out an hour without a value', () => {
    // Given hours below zero, where an hour without a value taken as 0 would be the highest
    const dates = ['2026-10-18'] as LocalDate[];
    const hourly = { time: ['2026-10-18T00:00', '2026-10-18T01:00'], values: [null, -1.5] };

    // When
    const maxima = dailyMaxima(dates, hourly);

    // Then
    expect(maxima).toEqual([-1.5]);
  });

  it('gives null for a date none of whose hours has a value', () => {
    // Given
    const dates = ['2026-10-18'] as LocalDate[];
    const hourly = { time: ['2026-10-18T00:00', '2026-10-18T01:00'], values: [null, null] };

    // When
    const maxima = dailyMaxima(dates, hourly);

    // Then
    expect(maxima).toEqual([null]);
  });
});
