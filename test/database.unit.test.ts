import { describe, expect, it } from 'vitest';

import { createTestApp } from './app.js';
import { fixedClock } from './fakes/clock.js';

describe('the test database', () => {
  it('is refused to a unit test, naming the levels that have one', async () => {
    // When / Then
    await expect(createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') })).rejects.toThrow(
      'a test that needs one ends in .int.test.ts or .e2e.test.ts',
    );
  });
});
