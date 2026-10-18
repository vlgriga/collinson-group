import { globSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// One project per test level; the file suffix declares the level (docs/testing.md).
const LEVELS = [
  { name: 'unit', suffix: '.unit.test.ts' },
  { name: 'integration', suffix: '.int.test.ts' },
  { name: 'e2e', suffix: '.e2e.test.ts' },
] as const;

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
    // Reported, not gated (docs/testing.md#what-is-covered-where): `npm test -- --coverage`.
    coverage: { provider: 'v8', include: ['src/**'], exclude: ['src/graphql/generated/**'] },
    projects: LEVELS.map(({ name, suffix }) => ({
      extends: true,
      test: { name, include: [`test/**/*${suffix}`] },
    })),
  },
});
