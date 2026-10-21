import {
  rate,
  scoreOutdoorSightseeing,
  summarizeWeek,
  type DailyWeather,
  type DayScore,
  type Rating,
} from '../scoring/index.js';
import { localWeek, type LocalDate } from '../shared/index.js';
import type { Clock, ForecastFetcher, Location, LocationResolver } from './ports.js';

export type RankingRequest = {
  city: string;
  /** ISO 3166-1 alpha-2; null when the match may be in any country. */
  countryCode: string | null;
  /** How many days to score, today first. */
  days: number;
};

export type Activity = 'OUTDOOR_SIGHTSEEING';

export type ActivityDay = {
  date: LocalDate;
  score: number;
  rating: Rating;
  reasons: string[];
};

export type ActivityForecast = {
  activity: Activity;
  score: number;
  bestDay: LocalDate;
  days: ActivityDay[];
};

export type Ranking = {
  location: Location;
  activities: ActivityForecast[];
};

/** Answers a ranking request: the place a city resolves to, and its coming days per activity. */
export class RankingService {
  readonly #locations: LocationResolver;
  readonly #forecasts: ForecastFetcher;
  readonly #clock: Clock;

  constructor(dependencies: {
    locations: LocationResolver;
    forecasts: ForecastFetcher;
    clock: Clock;
  }) {
    this.#locations = dependencies.locations;
    this.#forecasts = dependencies.forecasts;
    this.#clock = dependencies.clock;
  }

  async rank(request: RankingRequest): Promise<Ranking> {
    const location = await this.#locations.resolve(request);
    const week = localWeek(this.#clock.now(), location.timezone);
    // The whole week is fetched whatever is asked for (docs/design/activity-ranking.md).
    const days = (await this.#forecasts.fetch(location, week)).slice(0, request.days);
    return {
      location,
      activities: [forecastActivity('OUTDOOR_SIGHTSEEING', days, scoreOutdoorSightseeing)],
    };
  }
}

function forecastActivity(
  activity: Activity,
  days: readonly DailyWeather[],
  scoreDay: (day: DailyWeather) => DayScore,
): ActivityForecast {
  const scored = days.map((day) => {
    const { score, reasons } = scoreDay(day);
    return { date: day.date, score, rating: rate(score), reasons };
  });
  return { activity, ...summarizeWeek(scored), days: scored };
}
