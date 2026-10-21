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

  it('keeps the order of the Activity enum on a tie, whatever order they come in', () => {
    // Given
    const activities = [
      { activity: 'OUTDOOR_SIGHTSEEING', score: 50 },
      { activity: 'SKIING', score: 50 },
    ] as const;

    // When
    const ordered = orderActivities(activities);

    // Then
    expect(ordered.map(({ activity }) => activity)).toEqual(['SKIING', 'OUTDOOR_SIGHTSEEING']);
  });
});
