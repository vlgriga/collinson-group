import { describe, expect, it } from 'vitest';

import { createTestApp } from '../app.js';
import { fixedClock } from '../fakes/clock.js';
import { readDailyWeather } from './factories/forecast.js';

describe('Forecast ingest', () => {
  it("stores hourly snow depth as each day's maximum, in cm", async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await app.ranking.rank({ city: 'Val Thorens', countryCode: null, days: 7 });

    // Then
    // The highest of each day's hours in the recording, from 0.05 m to 0.12 m.
    const days = await readDailyWeather(app.db);
    expect(days.map(({ snowDepthMaxCm }) => snowDepthMaxCm)).toEqual(
      [5, 5, 6, 12, 12, 8, 5].map((cm) => expect.closeTo(cm, 9) as unknown),
    );
  });

  it("stores the day's highest temperature, its snowfall in cm and its strongest gust", async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await app.ranking.rank({ city: 'Val Thorens', countryCode: null, days: 7 });

    // Then
    const [today] = await readDailyWeather(app.db);
    expect(today).toEqual(
      expect.objectContaining({
        date: '2026-10-18',
        temperatureMaxC: 4,
        snowfallCm: 4.13,
        windGustsMaxKmh: 35.3,
      }),
    );
  });
});
