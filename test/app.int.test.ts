import { describe, expect, it } from 'vitest';

import { createTestApp } from './app.js';
import { fixedClock } from './fakes/clock.js';

describe('App close', () => {
  it('can be asked again once the app is closed', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
    await app.close();

    // When / Then
    await expect(app.close()).resolves.toBeUndefined();
  });
});
