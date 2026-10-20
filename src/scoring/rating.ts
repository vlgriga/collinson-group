import { RATING_THRESHOLDS } from '../config/index.js';

export type Rating = 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

/** A day's score in words. */
export function rate(score: number): Rating {
  if (score >= RATING_THRESHOLDS.excellent) {
    return 'EXCELLENT';
  }
  if (score >= RATING_THRESHOLDS.good) {
    return 'GOOD';
  }
  if (score >= RATING_THRESHOLDS.fair) {
    return 'FAIR';
  }
  return 'POOR';
}
