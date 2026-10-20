/** The machine's clock, for the processes; tests pass a fixed one instead. */
export const systemClock = {
  now: (): Date => new Date(),
};
