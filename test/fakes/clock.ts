import type { Clock } from '../../src/ranking/index.js';

/** A clock that stays at the instant it is given. */
export function fixedClock(instant: string): Clock {
  const now = new Date(instant);
  return { now: () => new Date(now) };
}
