import { SKIING } from '../config/index.js';
import type { DailyWeather, DayScore } from './daily-weather.js';
import { dayScore, MAX_SCORE, scoreFactor, sunshineShare, type Cap } from './factors.js';

export function scoreSkiing(day: DailyWeather): DayScore {
  const { factors, caps } = SKIING;
  const { snowDepthMaxCm, windGustsMaxKmh } = day;
  const applied: Cap[] = [];
  if (snowDepthMaxCm !== null && snowDepthMaxCm < caps.noSnow.belowCm) {
    applied.push({ maxScore: caps.noSnow.maxScore, reason: 'No snow to ski on' });
  }
  if (windGustsMaxKmh !== null && windGustsMaxKmh > caps.gusts.overKmh) {
    applied.push({ maxScore: caps.gusts.maxScore, reason: 'Gusts strong enough to close lifts' });
  }
  return dayScore(
    [
      scoreFactor(
        factors.snowDepth,
        snowDepthMaxCm,
        (cm) => `${cm.toFixed(0)} cm of snow on the ground`,
      ),
      scoreFactor(factors.freshSnow, day.snowfallCm, (cm) => `${cm.toFixed(0)} cm of fresh snow`),
      scoreFactor(
        factors.temperature,
        day.temperatureMaxC,
        (celsius) => `High of ${celsius.toFixed(0)} °C`,
      ),
      scoreFactor(factors.gusts, windGustsMaxKmh, (kmh) => `Gusts up to ${kmh.toFixed(0)} km/h`),
      scoreFactor(
        factors.sunshine,
        sunshineShare(day),
        (share) => `Sunshine ${(share * MAX_SCORE).toFixed(0)}% of daylight`,
      ),
    ],
    applied,
  );
}
