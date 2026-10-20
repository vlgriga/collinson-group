import { z } from 'zod';

import type { RankingRequest } from '../ranking/index.js';
import { ValidationError, WEEK_DAYS } from '../shared/index.js';
import type { QueryActivityRankingArgs } from './generated/resolvers.js';

// R1 in docs/prd.md.
const MAX_CITY_LENGTH = 100;

const CITY_RULE = `Expected 1 to ${String(MAX_CITY_LENGTH)} characters, not counting spaces around them`;

const ACTIVITY_RANKING_ARGS = z.object({
  city: z.string().trim().min(1, CITY_RULE).max(MAX_CITY_LENGTH, CITY_RULE),
  // The shape only: a code no country has finds no place (LOCATION_NOT_FOUND), and Open-Meteo
  // knows codes ISO has not assigned, such as XK for Kosovo. Geocoding needs it upper-cased.
  countryCode: z
    .string()
    .regex(/^[a-z]{2}$/i, 'Expected an ISO 3166-1 alpha-2 code, such as FR')
    .toUpperCase()
    .nullish()
    .transform((code) => code ?? null),
  days: z
    .int()
    .min(1, `Expected a whole number from 1 to ${String(WEEK_DAYS)}`)
    .max(WEEK_DAYS, `Expected a whole number from 1 to ${String(WEEK_DAYS)}`),
});

/** The arguments of activityRanking as the ranking takes them, or a ValidationError naming each one broken. */
export function parseActivityRankingArgs(args: QueryActivityRankingArgs): RankingRequest {
  const result = ACTIVITY_RANKING_ARGS.safeParse(args);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new ValidationError(`Invalid input: ${problems.join('; ')}`);
  }
  return result.data;
}
