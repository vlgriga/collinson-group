import { onTestFinished } from 'vitest';

import { createApp, type App } from '../src/app.js';
import { parseEnv } from '../src/config/index.js';
import type { Clock } from '../src/ranking/index.js';
import { useDatabase } from './database.js';

export type TestAppOptions = {
  clock: Clock;
};

/**
 * The app as api.ts and worker.ts build it, on this worker's emptied database; closed when the
 * test ends (docs/testing.md#where-a-test-enters).
 */
export async function createTestApp({ clock }: TestAppOptions): Promise<App> {
  const env = parseEnv({ DATABASE_URL: await useDatabase() });
  const app = createApp({ env, clock });
  onTestFinished(() => app.close());
  return app;
}
