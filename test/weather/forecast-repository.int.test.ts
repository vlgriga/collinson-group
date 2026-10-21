import { describe, expect, it } from 'vitest';

import type { LocalDate } from '../../src/shared/index.js';
import { ForecastRepository } from '../../src/weather/index.js';
import { createTestApp } from '../app.js';
import { fixedClock } from '../fakes/clock.js';
import { readLocations } from '../locations/factories/location.js';

describe('ForecastRepository read', () => {
  it('reads a place Marine found no sea at as having no sea forecast, though the place given predates that', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
    await app.ranking.rank({ city: 'Chamonix', countryCode: null, days: 7 });
    const [chamonix] = await readLocations(app.db);
    // As a request resolved it while another was fetching its first week.
    const resolvedBefore = { ...chamonix!, hasMarine: null };

    // When
    const stored = await new ForecastRepository({ db: app.db }).read(resolvedBefore, WEEK);

    // Then
    expect(stored?.marineDays).toBeNull();
  });
});

const WEEK = [
  '2026-10-18',
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
] as LocalDate[];
