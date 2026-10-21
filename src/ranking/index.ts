// The port's terms, for the modules that implement them.
export type { DailyWeather } from '../scoring/index.js';
export type {
  Clock,
  ForecastFetcher,
  ForecastReader,
  Location,
  LocationResolver,
  StoredForecast,
} from './ports.js';
export type { Activity } from '../scoring/index.js';
export {
  RankingService,
  type ActivityDay,
  type ActivityForecast,
  type Ranking,
  type RankingRequest,
} from './ranking-service.js';
