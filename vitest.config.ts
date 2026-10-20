import { globSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

import { LEVELS } from './test/levels.js';

const unleveled = globSync('{src,test}/**/*.test.ts').filter(
  (file) => file.startsWith('src/') || !LEVELS.some(({ suffix }) => file.endsWith(suffix)),
);
if (unleveled.length > 0) {
  throw new Error(
    `Test files must live under test/ and end in ${LEVELS.map(({ suffix }) => suffix).join(', ')}: ${unleveled.join(', ')}`,
  );
}

export default defineConfig({
  test: {
    sequence: { shuffle: true },
    // The root's global setup runs once per run and is not inherited by the projects, so one
    // Postgres serves every level that is part of the run.
    globalSetup: ['test/global-setup.ts'],
    // Reported, not gated (docs/testing.md#what-is-covered-where): `npm test -- --coverage`.
    coverage: { provider: 'v8', include: ['src/**'], exclude: ['src/graphql/generated/**'] },
    projects: LEVELS.map(({ name, suffix }) => ({
      extends: true,
      test: { name, include: [`test/**/*${suffix}`] },
    })),
  },
});
