import { OUTDOOR_SIGHTSEEING, type Factor } from '../config/index.js';
import { onCurve } from './curve.js';
import type { DailyWeather, DayScore } from './daily-weather.js';

const MAX_SCORE = 100;

/** Enough to explain a score without listing every factor. */
const REASON_COUNT = 3;

type Scored = { weight: number; subScore: number; reason: string };

/** A condition that limits the day's score whatever the factors make of it. */
type Cap = { maxScore: number; reason: string };

export function scoreOutdoorSightseeing(day: DailyWeather): DayScore {
  const { factors, caps } = OUTDOOR_SIGHTSEEING;
  const applied: Cap[] = [];
  if (caps.thunderstorm.weatherCodes.some((code) => code === day.weatherCode)) {
    applied.push({ maxScore: caps.thunderstorm.maxScore, reason: 'Thunderstorm' });
  }
  // In descending weight, which the reasons fall back on when factors cost the same.
  const scored = [
    score(factors.precipitation, day.precipitationMm, (mm) =>
      mm === 0 ? 'No precipitation' : `${mm.toFixed(1)} mm of precipitation`,
    ),
    score(
      factors.apparentTemperature,
      day.apparentTemperatureMaxC,
      (celsius) => `Feels like ${celsius.toFixed(0)} °C`,
    ),
    score(
      factors.sunshine,
      sunshineShare(day),
      (share) => `Sunshine ${(share * MAX_SCORE).toFixed(0)}% of daylight`,
    ),
    score(factors.wind, day.windSpeedMaxKmh, (kmh) => `Wind up to ${kmh.toFixed(0)} km/h`),
    score(factors.uv, day.uvIndexMax, (index) => `UV index up to ${index.toFixed(0)}`),
  ].filter((factor) => factor !== undefined);
  const uncapped = MAX_SCORE * weightedMean(scored);
  return {
    score: Math.round(Math.min(uncapped, ...applied.map(({ maxScore }) => maxScore))),
    reasons: [...applied, ...costliest(scored)].map(({ reason }) => reason).slice(0, REASON_COUNT),
  };
}

function score(
  factor: Factor,
  value: number | null,
  describe: (value: number) => string,
): Scored | undefined {
  return value === null
    ? undefined
    : { weight: factor.weight, subScore: onCurve(factor.curve, value), reason: describe(value) };
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

/** The factors that cost the day the most points; the sort is stable, so ties keep their order. */
function costliest(scored: Scored[]): Scored[] {
  const cost = ({ weight, subScore }: Scored): number => weight * (1 - subScore);
  return scored.toSorted((a, b) => cost(b) - cost(a)).slice(0, REASON_COUNT);
}
