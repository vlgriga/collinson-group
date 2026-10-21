import {
  rate,
  scoreOutdoorSightseeing,
  summarizeWeek,
  type DailyWeather,
  type DayScore,
  type Rating,
} from '../scoring/index.js';
import { localWeek, type LocalDate } from '../shared/index.js';
import type {
  Clock,
  ForecastFetcher,
  ForecastReader,
  Location,
  LocationResolver,
  StoredForecast,
} from './ports.js';

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
  /** When the forecast the days are scored from was fetched. */
  forecastFetchedAt: Date;
  activities: ActivityForecast[];
};

/** Answers a ranking request: the place a city resolves to, and its coming days per activity. */
export class RankingService {
  readonly #locations: LocationResolver;
  readonly #storedForecasts: ForecastReader;
  readonly #forecasts: ForecastFetcher;
  readonly #clock: Clock;

  constructor(dependencies: {
    locations: LocationResolver;
    storedForecasts: ForecastReader;
    forecasts: ForecastFetcher;
    clock: Clock;
  }) {
    this.#locations = dependencies.locations;
    this.#storedForecasts = dependencies.storedForecasts;
    this.#forecasts = dependencies.forecasts;
    this.#clock = dependencies.clock;
  }

  async rank(request: RankingRequest): Promise<Ranking> {
    const location = await this.#locations.resolve(request);
    const week = localWeek(this.#clock.now(), location.timezone);
    const forecast = await this.#forecastFor(location, week);
    const days = forecast.days.slice(0, request.days);
    return {
      location,
      forecastFetchedAt: forecast.fetchedAt,
      activities: [forecastActivity('OUTDOOR_SIGHTSEEING', days, scoreOutdoorSightseeing)],
    };
  }

  /**
   * The stored forecast while it covers the week, whatever is asked for, so that the days scored
   * are never more than a day old; fetched now otherwise (docs/design/activity-ranking.md).
   */
  async #forecastFor(location: Location, week: readonly LocalDate[]): Promise<StoredForecast> {
    const stored = await this.#storedForecasts.read(location, week);
    return coversWeek(stored, week) ? stored : this.#forecasts.fetch(location, week);
  }
}

/** Whether `forecast` holds a day for each date of `week`, and no other. */
function coversWeek(
  forecast: StoredForecast | undefined,
  week: readonly LocalDate[],
): forecast is StoredForecast {
  return (
    forecast?.days.length === week.length &&
    forecast.days.every(({ date }, day) => date === week[day])
  );
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
