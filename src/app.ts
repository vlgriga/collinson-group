import type { Env } from './config/index.js';
import { connectDatabase, type Database } from './db/index.js';
import { createGraphqlServer, type GraphqlServer } from './graphql/index.js';
import { GeocodingClient, LocationService } from './locations/index.js';
import { RankingService, type Clock } from './ranking/index.js';

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
  const database = connectDatabase(env.DATABASE_URL);
  const locations = new LocationService({ geocoding: new GeocodingClient() });
  const ranking = new RankingService({ locations });
  return { clock, db: database.db, yoga: createGraphqlServer(ranking), close: database.close };
}
