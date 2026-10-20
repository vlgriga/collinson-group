import { describe, expect, it } from 'vitest';

import { createTestApp } from '../app.js';
import { fixedClock } from '../fakes/clock.js';
import { requestActivityRanking } from './support.js';

describe('activityRanking', () => {
  it('answers with the place the geocoder resolved the city to', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Chamonix' });

    // Then
    expect(response.data?.activityRanking.location).toEqual({
      name: 'Chamonix',
      country: 'France',
      countryCode: 'FR',
      admin1: 'Auvergne-Rhône-Alpes',
      latitude: 45.92375,
      longitude: 6.86933,
      elevation: 1060,
      timezone: 'Europe/Paris',
    });
  });
});
