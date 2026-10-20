import { onTestFinished } from 'vitest';

import { createApp, type App } from '../src/app.js';
import { parseEnv } from '../src/config/index.js';
import type { Clock } from '../src/ranking/index.js';
import { useDatabase } from './database.js';
import { OpenMeteoFake } from './fakes/open-meteo.js';

export type TestAppOptions = {
  clock: Clock;
};

export type TestApp = App & {
  /** What the app asked Open-Meteo, answered from the recorded fixtures. */
  openMeteo: OpenMeteoFake;
};

/**
 * The app as api.ts and worker.ts build it, on this worker's emptied database and the Open-Meteo
 * fake; closed when the test ends (docs/testing.md#where-a-test-enters).
 */
export async function createTestApp({ clock }: TestAppOptions): Promise<TestApp> {
  const env = parseEnv({ DATABASE_URL: await useDatabase() });
  const openMeteo = new OpenMeteoFake();
  openMeteo.listen();
  onTestFinished(() => {
    openMeteo.close();
  });
  const app = createApp({ env, clock });
  onTestFinished(() => app.close());
  return { ...app, openMeteo };
}
