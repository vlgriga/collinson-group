import { SKIING } from '../config/index.js';
import type { DailyWeather, DayScore } from './daily-weather.js';
import {
  dayScore,
  scoreFactor,
  scoreSunshine,
  unrated,
  wholeDegrees,
  type Cap,
} from './factors.js';

export function scoreSkiing(day: DailyWeather): DayScore {
  const { factors, caps } = SKIING;
  const { snowDepthMaxCm, windGustsMaxKmh } = day;
  if (snowDepthMaxCm === null || windGustsMaxKmh === null) {
    return unrated({ 'Snow depth': snowDepthMaxCm, 'Wind gusts': windGustsMaxKmh });
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
        // Down, and gusts up, so that a reason never says what its cap rules out.
        (cm) => `${String(Math.floor(cm))} cm of snow on the ground`,
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
      scoreFactor(
        factors.gusts,
        windGustsMaxKmh,
        (kmh) => `Gusts up to ${String(Math.ceil(kmh))} km/h`,
      ),
      scoreSunshine(factors.sunshine, day),
    ],
    applied,
  );
}
