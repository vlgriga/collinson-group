import { describe, expect, it } from 'vitest';

import { localWeek, sameDates } from '../../src/shared/index.js';

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

describe('sameDates', () => {
  it('holds for the dates expected, in their order', () => {
    // Given
    const dates = ['2026-10-18', '2026-10-19'];

    // When
    const same = sameDates(dates, ['2026-10-18', '2026-10-19']);

    // Then
    expect(same).toBe(true);
  });

  it.each([
    { other: 'the same dates in another order', dates: ['2026-10-19', '2026-10-18'] },
    { other: 'one date fewer', dates: ['2026-10-18'] },
    { other: 'one date more', dates: ['2026-10-18', '2026-10-19', '2026-10-20'] },
    { other: 'a date a day later', dates: ['2026-10-18', '2026-10-20'] },
  ] as const)('does not hold for $other', ({ dates }) => {
    // When
    const same = sameDates(dates, ['2026-10-18', '2026-10-19']);

    // Then
    expect(same).toBe(false);
  });
});
