import { describe, expect, it } from 'vitest';

import { localWeek } from '../../src/shared/index.js';

describe('localWeek', () => {
  it('starts on the next date at 23:30 UTC in a place two hours ahead', () => {
    // Given
    const instant = new Date('2026-10-18T23:30:00Z');

    // When
    const week = localWeek(instant, 'Europe/Paris');

    // Then
    expect(week).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('still starts on the previous date at 03:00 UTC in a place five hours behind', () => {
    // Given
    const instant = new Date('2026-10-18T03:00:00Z');

    // When
    const week = localWeek(instant, 'America/Chicago');

    // Then
    expect(week).toEqual([
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]);
  });

  it('runs on across the end of a month', () => {
    // Given
    const instant = new Date('2026-10-28T12:00:00Z');

    // When
    const week = localWeek(instant, 'UTC');

    // Then
    expect(week).toEqual([
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
  });
});
