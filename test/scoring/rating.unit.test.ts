import { describe, expect, it } from 'vitest';

import { rate } from '../../src/scoring/index.js';

describe('rate', () => {
  it.each([
    { score: 39, rating: 'POOR' },
    { score: 40, rating: 'FAIR' },
    { score: 59, rating: 'FAIR' },
    { score: 60, rating: 'GOOD' },
    { score: 79, rating: 'GOOD' },
    { score: 80, rating: 'EXCELLENT' },
  ] as const)('rates $score as $rating', ({ score, rating }) => {
    // When
    const rated = rate(score);

    // Then
    expect(rated).toBe(rating);
  });
});
