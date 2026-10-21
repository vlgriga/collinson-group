/** The activities days are scored for, in the order of the API's Activity enum. */
export const ACTIVITIES = ['SKIING', 'OUTDOOR_SIGHTSEEING', 'INDOOR_SIGHTSEEING'] as const;

export type Activity = (typeof ACTIVITIES)[number];

/** Activities summed up over the same days, the best weekly score first; a tie in ACTIVITIES order. */
export function orderActivities<T extends { activity: Activity; score: number }>(
  activities: readonly T[],
): T[] {
  const rank = ({ activity }: T): number => ACTIVITIES.indexOf(activity);
  return activities.toSorted((a, b) => b.score - a.score || rank(a) - rank(b));
}
