import type { Clock } from '../../src/ranking/index.js';

export type FixedClock = Clock & {
  /** Moves the clock to `instant`, where it stays until moved again. */
  advanceTo(instant: string): void;
};

/** A clock that stays at the instant it is given, until the test moves it on. */
export function fixedClock(instant: string): FixedClock {
  let now = readInstant(instant);
  return {
    now: () => new Date(now),
    advanceTo: (later) => {
      const next = readInstant(later);
      if (next < now) {
        throw new Error(`The clock does not go back: ${later} is before ${now.toISOString()}`);
      }
      now = next;
    },
  };
}

function readInstant(instant: string): Date {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Not an instant: ${instant}`);
  }
  return date;
}
