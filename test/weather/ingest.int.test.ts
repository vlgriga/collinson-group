import { describe, expect, it } from 'vitest';

import { UpstreamUnavailableError } from '../../src/shared/index.js';
import { createTestApp } from '../app.js';
import { fixedClock } from '../fakes/clock.js';
import { readLocations } from '../locations/factories/location.js';
import { readDailyMarine, readDailyWeather, readForecastFetches } from './factories/forecast.js';

describe('Forecast ingest', () => {
  it("stores hourly snow depth as each day's maximum, in cm", async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await app.ranking.rank({ city: 'Val Thorens', countryCode: null, days: 7 });

    // Then
    // The highest of each day's hours in the recording, from 0.05 m to 0.12 m.
    const days = await readDailyWeather(app.db);
    expect(days.map(({ snowDepthMaxCm }) => snowDepthMaxCm)).toEqual([5, 5, 6, 12, 12, 8, 5]);
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

  it("stores the 7 days of a coastal place's sea and a successful marine fetch, marking it as having a sea", async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await app.ranking.rank({ city: 'Biarritz', countryCode: null, days: 7 });

    // Then
    const [biarritz] = await readLocations(app.db);
    expect(biarritz?.hasMarine).toBe(true);
    expect(await readDailyMarine(app.db)).toEqual(
      WEEK.map((date) => expect.objectContaining({ locationId: biarritz?.id, date }) as unknown),
    );
    expect(await readForecastFetches(app.db)).toContainEqual(
      expect.objectContaining({
        locationId: biarritz?.id,
        source: 'MARINE',
        status: 'SUCCEEDED',
        fetchedAt: new Date('2026-10-18T09:00:00Z'),
        rawPayload: expect.objectContaining({
          daily: expect.objectContaining({ time: WEEK }) as unknown,
        }) as unknown,
      }),
    );
  });

  it('stores no sea for an inland place, Marine having no value for it, marking it as having none', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await app.ranking.rank({ city: 'Chamonix', countryCode: null, days: 7 });

    // Then
    const [chamonix] = await readLocations(app.db);
    expect(chamonix?.hasMarine).toBe(false);
    expect(await readDailyMarine(app.db)).toEqual([]);
    expect(await readForecastFetches(app.db)).toContainEqual(
      expect.objectContaining({ locationId: chamonix?.id, source: 'MARINE', status: 'SUCCEEDED' }),
    );
  });

  it("stores the day's highest wave height in m and its longest swell period in s", async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await app.ranking.rank({ city: 'Biarritz', countryCode: null, days: 7 });

    // Then
    const [today] = await readDailyMarine(app.db);
    expect(today).toEqual(
      expect.objectContaining({
        date: '2026-10-18',
        waveHeightMaxM: 3.56,
        swellWavePeriodMaxS: 11.1,
      }),
    );
  });

  it('keeps what it knew of the sea at a place when Marine fails', async () => {
    // Given
    const clock = fixedClock('2026-10-18T09:00:00Z');
    const app = await createTestApp({ clock });
    await app.ranking.rank({ city: 'Biarritz', countryCode: null, days: 7 });
    clock.advanceTo('2026-10-19T09:00:00Z');
    app.openMeteo.fail('marine', { status: 500 });

    // When / Then
    await expect(
      app.ranking.rank({ city: 'Biarritz', countryCode: null, days: 7 }),
    ).rejects.toThrow(UpstreamUnavailableError);
    const [biarritz] = await readLocations(app.db);
    expect(biarritz?.hasMarine).toBe(true);
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
];
