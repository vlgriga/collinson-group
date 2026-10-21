import { SKIING } from '../config/index.js';
import type { DailyWeather, DayScore } from './daily-weather.js';
import { dayScore, MAX_SCORE, scoreFactor, sunshineShare } from './factors.js';

export function scoreSkiing(day: DailyWeather): DayScore {
  const { factors } = SKIING;
  return dayScore(
    [
      scoreFactor(
        factors.snowDepth,
        day.snowDepthMaxCm,
        (cm) => `${cm.toFixed(0)} cm of snow on the ground`,
      ),
      scoreFactor(factors.freshSnow, day.snowfallCm, (cm) => `${cm.toFixed(0)} cm of fresh snow`),
      scoreFactor(
        factors.temperature,
        day.temperatureMaxC,
        (celsius) => `High of ${celsius.toFixed(0)} °C`,
      ),
      scoreFactor(
        factors.gusts,
        day.windGustsMaxKmh,
        (kmh) => `Gusts up to ${kmh.toFixed(0)} km/h`,
      ),
      scoreFactor(
        factors.sunshine,
        sunshineShare(day),
        (share) => `Sunshine ${(share * MAX_SCORE).toFixed(0)}% of daylight`,
      ),
    ],
    [],
  );
}
