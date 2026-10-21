import { OUTDOOR_SIGHTSEEING } from '../config/index.js';
import type { DailyWeather, DayScore } from './daily-weather.js';
import {
  dayScore,
  scoreFactor,
  scoreSunshine,
  unrated,
  wholeDegrees,
  type Cap,
} from './factors.js';

export function scoreOutdoorSightseeing(day: DailyWeather): DayScore {
  const { factors, caps } = OUTDOOR_SIGHTSEEING;
  const { precipitationMm, weatherCode } = day;
  if (precipitationMm === null || weatherCode === null) {
    return unrated({ Precipitation: precipitationMm, 'Weather code': weatherCode });
  }
  const applied: Cap[] = [];
  if (caps.thunderstorm.weatherCodes.some((code) => code === weatherCode)) {
    applied.push({ maxScore: caps.thunderstorm.maxScore, reason: 'Thunderstorm' });
  }
  if (precipitationMm >= caps.heavyPrecipitation.fromMm) {
    applied.push({ maxScore: caps.heavyPrecipitation.maxScore, reason: 'Heavy rain or snow' });
  }
  return dayScore(
    [
      scoreFactor(factors.precipitation, precipitationMm, (mm) => {
        const shown = mm.toFixed(1);
        return shown === '0.0' ? 'No precipitation' : `${shown} mm of precipitation`;
      }),
      scoreFactor(
        factors.apparentTemperature,
        day.apparentTemperatureMaxC,
        (celsius) => `Feels like ${wholeDegrees(celsius)} °C`,
      ),
      scoreSunshine(factors.sunshine, day),
      scoreFactor(factors.wind, day.windSpeedMaxKmh, (kmh) => `Wind up to ${kmh.toFixed(0)} km/h`),
      scoreFactor(factors.uv, day.uvIndexMax, (index) => `UV index up to ${index.toFixed(0)}`),
    ],
    applied,
  );
}
