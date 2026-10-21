// What every activity's scorer does the same way: factors on their curves, weighed, then capped.
import type { Factor } from '../config/index.js';
import { onCurve } from './curve.js';
import type { DailyWeather, DayScore } from './daily-weather.js';

export const MAX_SCORE = 100;

/** Enough to explain a score without listing every factor. */
const REASON_COUNT = 3;

/** A factor of the day: its share of the score, the 0–1 it earns, and how it reads as a reason. */
export type Scored = { weight: number; subScore: number; reason: string };

/** A condition that limits the day's score whatever the factors make of it. */
export type Cap = { maxScore: number; reason: string };

/** `value` on the factor's curve; undefined when the forecast has no value. */
export function scoreFactor(
  factor: Factor,
  value: number | null,
  describe: (value: number) => string,
): Scored | undefined {
  return value === null
    ? undefined
    : { weight: factor.weight, subScore: onCurve(factor.curve, value), reason: describe(value) };
}

export function sunshineShare({
  sunshineDurationH,
  daylightDurationH,
}: DailyWeather): number | null {
  if (sunshineDurationH === null || daylightDurationH === null) {
    return null;
  }
  // A polar night has no daylight to share, and no sun either. The model's sunshine can run a
  // little past its daylight; the day was sunny throughout, no more.
  return daylightDurationH > 0 ? Math.min(sunshineDurationH / daylightDurationH, 1) : 0;
}

/**
 * The day's score from its factors, given in descending weight, which the reasons fall back on
 * when factors cost the same; a factor without a value is left out. The caps that apply lead the
 * reasons.
 */
export function dayScore(factors: readonly (Scored | undefined)[], caps: readonly Cap[]): DayScore {
  const scored = factors.filter((factor) => factor !== undefined);
  const uncapped = MAX_SCORE * weightedMean(scored);
  return {
    score: Math.round(Math.min(uncapped, ...caps.map(({ maxScore }) => maxScore))),
    reasons: [...caps, ...costliest(scored)].map(({ reason }) => reason).slice(0, REASON_COUNT),
  };
}

/** A missing factor is left out, and the weights of the others rescaled to add up to 1. */
function weightedMean(scored: readonly Scored[]): number {
  const totalWeight = scored.reduce((total, { weight }) => total + weight, 0);
  const total = scored.reduce((sum, { weight, subScore }) => sum + weight * subScore, 0);
  return total / totalWeight;
}

/** The factors that cost the day the most points; the sort is stable, so ties keep their order. */
function costliest(scored: readonly Scored[]): Scored[] {
  const cost = ({ weight, subScore }: Scored): number => weight * (1 - subScore);
  return scored.toSorted((a, b) => cost(b) - cost(a)).slice(0, REASON_COUNT);
}
