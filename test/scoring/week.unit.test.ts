import { describe, expect, it } from 'vitest';

import { summarizeWeek } from '../../src/scoring/index.js';
import type { LocalDate } from '../../src/shared/index.js';

describe('summarizeWeek', () => {
  it('scores the week as the mean of its days, rounded half up', () => {
    // Given
    const days = [scored('2026-10-18', 60), scored('2026-10-19', 71)];

    // When
    const { score } = summarizeWeek(days);

    // Then
    expect(score).toBe(66);
  });

  it('takes the day with the highest score as the best day', () => {
    // Given
    const days = [scored('2026-10-18', 40), scored('2026-10-19', 90), scored('2026-10-20', 70)];

    // When
    const { bestDay } = summarizeWeek(days);

    // Then
    expect(bestDay).toBe('2026-10-19');
  });

  it('takes the earliest of the days that share the highest score as the best day', () => {
    // Given
    const days = [scored('2026-10-18', 40), scored('2026-10-19', 90), scored('2026-10-20', 90)];

    // When
    const { bestDay } = summarizeWeek(days);

    // Then
    expect(bestDay).toBe('2026-10-19');
  });
});

function scored(date: string, score: number): { date: LocalDate; score: number } {
  return { date: date as LocalDate, score };
}
