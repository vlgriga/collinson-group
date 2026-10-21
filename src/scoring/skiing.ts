import { SKIING } from '../config/index.js';
import type { DailyWeather, DayScore } from './daily-weather.js';
import { dayScore, scoreFactor, scoreSunshine, wholeDegrees, type Cap } from './factors.js';

export function scoreSkiing(day: DailyWeather): DayScore {
  const { factors, caps } = SKIING;
  const { snowDepthMaxCm, windGustsMaxKmh } = day;
  // A cap cannot be ruled out without its value, and a day that might be pointless or dangerous
  // is not rated.
  if (snowDepthMaxCm === null || windGustsMaxKmh === null) {
    return {
      score: 0,
      reasons: [
        ...(snowDepthMaxCm === null ? ['Snow depth missing from the forecast'] : []),
        ...(windGustsMaxKmh === null ? ['Wind gusts missing from the forecast'] : []),
      ],
    };
  }
  const applied: Cap[] = [];
  if (snowDepthMaxCm < caps.noSnow.belowCm) {
    applied.push({ maxScore: caps.noSnow.maxScore, reason: 'No snow to ski on' });
  }
  if (windGustsMaxKmh > caps.gusts.overKmh) {
    applied.push({ maxScore: caps.gusts.maxScore, reason: 'Gusts strong enough to close lifts' });
  }
  return dayScore(
    [
      scoreFactor(
        factors.snowDepth,
        snowDepthMaxCm,
        (cm) => `${cm.toFixed(0)} cm of snow on the ground`,
      ),
      scoreFactor(factors.freshSnow, day.snowfallCm, (cm) => {
        const shown = cm.toFixed(0);
        return shown === '0' ? 'No fresh snow' : `${shown} cm of fresh snow`;
      }),
      scoreFactor(
        factors.temperature,
        day.temperatureMaxC,
        (celsius) => `High of ${wholeDegrees(celsius)} °C`,
      ),
      scoreFactor(factors.gusts, windGustsMaxKmh, (kmh) => `Gusts up to ${kmh.toFixed(0)} km/h`),
      scoreSunshine(factors.sunshine, day),
    ],
    applied,
  );
}
