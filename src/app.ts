import type { Env } from './config/index.js';
import { connectDatabase, type Database } from './db/index.js';
import type { Clock } from './ranking/index.js';

export type AppDependencies = {
  env: Env;
  clock: Clock;
};

export type App = {
  clock: Clock;
  db: Database;
  /** Releases what the app holds open; the caller stops taking work first. */
  close: () => Promise<void>;
};

/**
 * The one wiring of the service. api.ts, worker.ts and the test app all build the app here and
 * differ only in what they pass in (docs/architecture/bootstrap.md).
 */
export function createApp({ env, clock }: AppDependencies): App {
  const database = connectDatabase(env.DATABASE_URL);
  return { clock, db: database.db, close: database.close };
}
