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
  const { precipitationMm, weatherCode } = day;
  // A cap cannot be ruled out without its value, and a day that might be dangerous is not rated.
  if (precipitationMm === null || weatherCode === null) {
    return {
      score: 0,
      reasons: [
        ...(precipitationMm === null ? ['Precipitation missing from the forecast'] : []),
        ...(weatherCode === null ? ['Weather code missing from the forecast'] : []),
      ],
    };
  }
  const applied: Cap[] = [];
  if (caps.thunderstorm.weatherCodes.some((code) => code === weatherCode)) {
    applied.push({ maxScore: caps.thunderstorm.maxScore, reason: 'Thunderstorm' });
  }
  if (precipitationMm >= caps.heavyPrecipitation.fromMm) {
    applied.push({ maxScore: caps.heavyPrecipitation.maxScore, reason: 'Heavy rain or snow' });
  }
  // In descending weight, which the reasons fall back on when factors cost the same.
  const scored = [
    score(factors.precipitation, precipitationMm, (mm) => {
      const shown = mm.toFixed(1);
      return shown === '0.0' ? 'No precipitation' : `${shown} mm of precipitation`;
    }),
    score(
      factors.apparentTemperature,
      day.apparentTemperatureMaxC,
      // Just below freezing rounds to -0, which toFixed would print with its sign.
      (celsius) => `Feels like ${String(Math.round(celsius) || 0)} °C`,
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
  if (sunshineDurationH === null || daylightDurationH === null) {
    return null;
  }
  // A polar night has no daylight to share, and no sun either. The model's sunshine can run a
  // little past its daylight; the day was sunny throughout, no more.
  return daylightDurationH > 0 ? Math.min(sunshineDurationH / daylightDurationH, 1) : 0;
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
