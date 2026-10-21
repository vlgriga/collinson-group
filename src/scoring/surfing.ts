import { SURFING } from '../config/index.js';
import type { DailyMarine, DailyWeather, DayScore } from './daily-weather.js';
import { dayScore, scoreFactor, unrated, wholeDegrees, type Cap } from './factors.js';

/** Tenths in a metre: a reason gives wave heights to the tenth. */
const TENTHS = 10;

export function scoreSurfing(day: DailyWeather & DailyMarine): DayScore {
  const { factors, caps } = SURFING;
  const { waveHeightMaxM, weatherCode } = day;
  if (waveHeightMaxM === null || weatherCode === null) {
    return unrated({ 'Wave height': waveHeightMaxM, 'Weather code': weatherCode });
  }
  const applied: Cap[] = [];
  if (waveHeightMaxM > caps.dangerousWaves.overM) {
    applied.push({
      maxScore: caps.dangerousWaves.maxScore,
      reason: 'Waves too big for all but experts',
    });
  }
  if (caps.thunderstorm.weatherCodes.some((code) => code === weatherCode)) {
    applied.push({ maxScore: caps.thunderstorm.maxScore, reason: 'Thunderstorm' });
  }
  return dayScore(
    [
      scoreFactor(
        factors.waveHeight,
        waveHeightMaxM,
        // Up, so that a reason never says what its cap rules out.
        (metres) => `Waves up to ${(Math.ceil(metres * TENTHS) / TENTHS).toFixed(1)} m`,
      ),
      scoreFactor(
        factors.swellPeriod,
        day.swellWavePeriodMaxS,
        (seconds) => `Swell period of ${seconds.toFixed(0)} s`,
      ),
      scoreFactor(factors.wind, day.windSpeedMaxKmh, (kmh) => `Wind up to ${kmh.toFixed(0)} km/h`),
      scoreFactor(
        factors.temperature,
        day.temperatureMaxC,
        (celsius) => `High of ${wholeDegrees(celsius)} °C`,
      ),
    ],
    applied,
  );
}
