import type { Env } from './config/index.js';
import { connectDatabase, type Database } from './db/index.js';
import { createGraphqlServer, type GraphqlServer } from './graphql/index.js';
import { GeocodingClient, LocationRepository, LocationService } from './locations/index.js';
import { RankingService, type Clock } from './ranking/index.js';
import { ForecastClient, ForecastRepository, ForecastService } from './weather/index.js';

export type AppDependencies = {
  env: Env;
  clock: Clock;
};

export type App = {
  clock: Clock;
  db: Database;
  /** The GraphQL API: api.ts serves it over HTTP, tests call its `fetch`. */
  yoga: GraphqlServer;
  /** Releases what the app holds open; the caller stops taking work first. */
  close: () => Promise<void>;
};

/**
 * The one wiring of the service. api.ts, worker.ts and the test app all build the app here and
 * differ only in what they pass in (docs/architecture/bootstrap.md).
 */
export function createApp({ env, clock }: AppDependencies): App {
  const { db, close } = connectDatabase(env.DATABASE_URL);
  const locations = new LocationService({
    geocoding: new GeocodingClient(),
    repository: new LocationRepository({ db }),
  });
  const storedForecasts = new ForecastRepository({ db });
  const forecasts = new ForecastService({
    client: new ForecastClient(),
    repository: storedForecasts,
    clock,
  });
  const ranking = new RankingService({ locations, storedForecasts, forecasts, clock });
  return { clock, db, yoga: createGraphqlServer(ranking), close };
}
