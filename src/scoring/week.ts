import type { LocalDate } from '../shared/index.js';

type ScoredDay = { date: LocalDate; score: number };

export type WeekSummary = {
  /** The plain mean of the days' scores, rounded half up: near days weigh no more. */
  score: number;
  /** The day with the highest score; the earliest of them on a tie. */
  bestDay: LocalDate;
};

/** Sums up days given in date order. */
export function summarizeWeek(days: readonly ScoredDay[]): WeekSummary {
  const [first, ...rest] = days;
  if (first === undefined) {
    throw new Error('A week has at least one day');
  }
  // Strictly greater: on a tie the earlier day stays.
  const best = rest.reduce((top, day) => (day.score > top.score ? day : top), first);
  const total = days.reduce((sum, { score }) => sum + score, 0);
  return { score: Math.round(total / days.length), bestDay: best.date };
}
