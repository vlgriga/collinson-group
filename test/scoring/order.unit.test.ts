import { describe, expect, it } from 'vitest';

import { orderActivities } from '../../src/scoring/index.js';

describe('orderActivities', () => {
  it('puts the activity with the higher weekly score first', () => {
    // Given
    const activities = [
      { activity: 'SKIING', score: 30 },
      { activity: 'OUTDOOR_SIGHTSEEING', score: 70 },
    ] as const;

    // When
    const ordered = orderActivities(activities);

    // Then
    expect(ordered.map(({ activity }) => activity)).toEqual(['OUTDOOR_SIGHTSEEING', 'SKIING']);
  });

  it('lists an activity without a weekly score last, below one that scores 0, though the enum has it first', () => {
    // Given
    const activities = [
      { activity: 'SKIING', score: null },
      { activity: 'INDOOR_SIGHTSEEING', score: 0 },
    ] as const;

    // When
    const ordered = orderActivities(activities);

    // Then
    expect(ordered.map(({ activity }) => activity)).toEqual(['INDOOR_SIGHTSEEING', 'SKIING']);
  });

  it.each([
    { first: 'SKIING', second: 'OUTDOOR_SIGHTSEEING' },
    { first: 'OUTDOOR_SIGHTSEEING', second: 'INDOOR_SIGHTSEEING' },
  ] as const)(
    'keeps the order of the Activity enum on a tie, $first before $second, whatever order they come in',
    ({ first, second }) => {
      // Given
      const activities = [
        { activity: second, score: 50 },
        { activity: first, score: 50 },
      ];

      // When
      const ordered = orderActivities(activities);

      // Then
      expect(ordered.map(({ activity }) => activity)).toEqual([first, second]);
    },
  );
});
