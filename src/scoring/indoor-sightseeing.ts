import { INDOOR_SIGHTSEEING } from '../config/index.js';
import type { DailyWeather, DayScore } from './daily-weather.js';
import { MAX_SCORE } from './factors.js';
import { scoreOutdoorSightseeing } from './outdoor-sightseeing.js';

export function scoreIndoorSightseeing(day: DailyWeather): DayScore {
  const { baseScore, outdoorShortfallShare } = INDOOR_SIGHTSEEING;
  const outdoor = scoreOutdoorSightseeing(day);
  return {
    // A day outdoor sightseeing cannot rate may have been perfect outside.
    score: outdoor.rated
      ? Math.round(baseScore + outdoorShortfallShare * (MAX_SCORE - outdoor.score))
      : baseScore,
    reasons: outdoor.reasons.map((reason) => `Outside: ${reason}`),
    rated: outdoor.rated,
  };
}
