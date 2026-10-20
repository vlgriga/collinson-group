// The test levels, one Vitest project each, told apart by the file suffix (docs/testing.md).
export const LEVELS = [
  { name: 'unit', suffix: '.unit.test.ts', database: false },
  { name: 'integration', suffix: '.int.test.ts', database: true },
  { name: 'e2e', suffix: '.e2e.test.ts', database: true },
] as const;
