import { OUTDOOR_SIGHTSEEING, type Factor } from '../config/index.js';
import { onCurve } from './curve.js';
import type { DailyWeather, DayScore } from './daily-weather.js';

const MAX_SCORE = 100;

type Scored = { weight: number; subScore: number };

export function scoreOutdoorSightseeing(day: DailyWeather): DayScore {
  const { factors } = OUTDOOR_SIGHTSEEING;
  const scored = [
    score(factors.precipitation, day.precipitationMm),
    score(factors.apparentTemperature, day.apparentTemperatureMaxC),
    score(factors.sunshine, sunshineShare(day)),
    score(factors.wind, day.windSpeedMaxKmh),
    score(factors.uv, day.uvIndexMax),
  ].filter((factor) => factor !== undefined);
  return { score: Math.round(MAX_SCORE * weightedMean(scored)), reasons: [] };
}

function score(factor: Factor, value: number | null): Scored | undefined {
  return value === null
    ? undefined
    : { weight: factor.weight, subScore: onCurve(factor.curve, value) };
}

function sunshineShare({ sunshineDurationH, daylightDurationH }: DailyWeather): number | null {
  return sunshineDurationH === null || daylightDurationH === null
    ? null
    : sunshineDurationH / daylightDurationH;
}

/** A missing factor is left out, and the weights of the others rescaled to add up to 1. */
function weightedMean(scored: Scored[]): number {
  const totalWeight = scored.reduce((total, { weight }) => total + weight, 0);
  const total = scored.reduce((sum, { weight, subScore }) => sum + weight * subScore, 0);
  return total / totalWeight;
}
