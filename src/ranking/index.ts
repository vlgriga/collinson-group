// The port's terms, for the modules that implement them.
export type { DailyWeather } from '../scoring/index.js';
export type {
  Clock,
  ForecastFetcher,
  ForecastReader,
  Location,
  LocationResolver,
} from './ports.js';
export {
  RankingService,
  type Activity,
  type ActivityDay,
  type ActivityForecast,
  type Ranking,
  type RankingRequest,
} from './ranking-service.js';
