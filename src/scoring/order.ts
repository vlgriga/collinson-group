/** The activities days are scored for, in the order of the API's Activity enum. */
export const ACTIVITIES = [
  'SKIING',
  'SURFING',
  'OUTDOOR_SIGHTSEEING',
  'INDOOR_SIGHTSEEING',
] as const;

export type Activity = (typeof ACTIVITIES)[number];

/**
 * Activities summed up over the same days, the best weekly score first and those without one, as
 * an activity the place cannot support has none, last; a tie in ACTIVITIES order.
 */
export function orderActivities<T extends { activity: Activity; score: number | null }>(
  activities: readonly T[],
): T[] {
  const rank = ({ activity }: T): number => ACTIVITIES.indexOf(activity);
  return activities.toSorted((a, b) => byScore(a.score, b.score) || rank(a) - rank(b));
}

/** The higher score first, and no score after any. */
function byScore(a: number | null, b: number | null): number {
  if (a === null || b === null) {
    return Number(a === null) - Number(b === null);
  }
  return b - a;
}
