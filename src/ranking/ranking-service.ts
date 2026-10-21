import {
  ACTIVITIES,
  orderActivities,
  rate,
  scoreIndoorSightseeing,
  scoreOutdoorSightseeing,
  scoreSkiing,
  scoreSurfing,
  summarizeWeek,
  type Activity,
  type DailyMarine,
  type DailyWeather,
  type DayScore,
  type Rating,
} from '../scoring/index.js';
import { localWeek, sameDates, type LocalDate } from '../shared/index.js';
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

export type ActivityDay = {
  date: LocalDate;
  score: number;
  rating: Rating;
  reasons: string[];
};

/** The coming days for one activity; none scored where the place does not support it. */
export type ActivityForecast = { activity: Activity } & (
  | {
      available: true;
      unavailableReason: null;
      score: number;
      bestDay: LocalDate;
      days: ActivityDay[];
    }
  | { available: false; unavailableReason: string; score: null; bestDay: null; days: [] }
);

export type Ranking = {
  location: Location;
  /** When the forecast the days are scored from was fetched. */
  forecastFetchedAt: Date;
  /** The best weekly score first, those not available last. */
  activities: ActivityForecast[];
};

/** How a day is scored for each activity its weather alone decides. */
const WEATHER_SCORERS: Record<Exclude<Activity, 'SURFING'>, (day: DailyWeather) => DayScore> = {
  SKIING: scoreSkiing,
  OUTDOOR_SIGHTSEEING: scoreOutdoorSightseeing,
  INDOOR_SIGHTSEEING: scoreIndoorSightseeing,
};

/** Surfing's reason where Marine forecasts no sea (docs/design/activity-ranking.md#scoring). */
const NO_MARINE_FORECAST = 'No marine forecast here';

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
    const marineDays = forecast.marineDays?.slice(0, request.days) ?? null;
    return {
      location,
      forecastFetchedAt: forecast.fetchedAt,
      activities: orderActivities(
        ACTIVITIES.map((activity) => forecastActivity(activity, days, marineDays)),
      ),
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

/**
 * Whether `forecast` holds a day for each date of `week`, and no other; and so does its sea, unless
 * the place has no sea forecast.
 */
function coversWeek(
  forecast: StoredForecast | undefined,
  week: readonly LocalDate[],
): forecast is StoredForecast {
  return (
    forecast !== undefined &&
    sameDates(datesOf(forecast.days), week) &&
    (forecast.marineDays === null || sameDates(datesOf(forecast.marineDays), week))
  );
}

function datesOf(days: readonly { date: LocalDate }[]): LocalDate[] {
  return days.map(({ date }) => date);
}

/** An activity's days scored, or why the place does not support it. */
function forecastActivity(
  activity: Activity,
  days: readonly DailyWeather[],
  marineDays: readonly DailyMarine[] | null,
): ActivityForecast {
  if (activity !== 'SURFING') {
    return scoredForecast(activity, days, WEATHER_SCORERS[activity]);
  }
  return marineDays === null
    ? {
        activity,
        available: false,
        unavailableReason: NO_MARINE_FORECAST,
        score: null,
        bestDay: null,
        days: [],
      }
    : scoredForecast(activity, withSea(days, marineDays), scoreSurfing);
}

/** Each day with its sea's values; the two hold the same dates, as the week they cover. */
function withSea(
  days: readonly DailyWeather[],
  marineDays: readonly DailyMarine[],
): (DailyWeather & DailyMarine)[] {
  return days.map((day, index) => {
    const sea = marineDays[index];
    if (sea?.date !== day.date) {
      throw new Error(`No sea forecast for ${day.date}`);
    }
    return { ...day, ...sea };
  });
}

function scoredForecast<Day extends DailyWeather>(
  activity: Activity,
  days: readonly Day[],
  scoreDay: (day: Day) => DayScore,
): ActivityForecast {
  const scored = days.map((day) => {
    const { score, reasons } = scoreDay(day);
    return { date: day.date, score, rating: rate(score), reasons };
  });
  return {
    activity,
    available: true,
    unavailableReason: null,
    ...summarizeWeek(scored),
    days: scored,
  };
}
