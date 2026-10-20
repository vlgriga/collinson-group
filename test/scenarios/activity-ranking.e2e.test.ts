import { describe, expect, it } from 'vitest';

import { createTestApp } from '../app.js';
import { fixedClock } from '../fakes/clock.js';
import { readLocations } from '../locations/factories/location.js';
import { readDailyWeather, readForecastFetches } from '../weather/factories/forecast.js';
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

  it('scores outdoor sightseeing for the 7 days from today, each with a rating and a reason', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Chamonix' });

    // Then
    expect(response.data?.activityRanking.activities).toEqual([
      {
        activity: 'OUTDOOR_SIGHTSEEING',
        score: A_SCORE,
        bestDay: ONE_OF_THE_WEEK,
        days: WEEK.map((date) => ({
          date,
          score: A_SCORE,
          rating: A_RATING,
          reasons: SOME_REASON,
        })),
      },
    ]);
  });

  it('stores the place, its 7 days of weather and a successful forecast fetch', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await requestActivityRanking(app, { city: 'Chamonix' });

    // Then
    const [chamonix, ...others] = await readLocations(app.db);
    expect({ geocodingId: chamonix?.geocodingId, others }).toEqual({
      geocodingId: 3027301,
      others: [],
    });
    expect(await readDailyWeather(app.db)).toEqual(
      WEEK.map((date) => expect.objectContaining({ locationId: chamonix?.id, date }) as unknown),
    );
    expect(await readForecastFetches(app.db)).toEqual([
      expect.objectContaining({
        locationId: chamonix?.id,
        source: 'FORECAST',
        status: 'SUCCEEDED',
        fetchedAt: new Date('2026-10-18T09:00:00Z'),
        rawPayload: expect.objectContaining({
          daily: expect.objectContaining({ time: WEEK }) as unknown,
        }) as unknown,
      }) as unknown,
    ]);
  });

  it('stores the days in metric units, with durations in hours', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    await requestActivityRanking(app, { city: 'Chamonix' });

    // Then
    const [today] = await readDailyWeather(app.db);
    expect(today).toEqual(
      expect.objectContaining({
        date: '2026-10-18',
        precipitationMm: 3.1,
        apparentTemperatureMaxC: 15.6,
        // 5120.99 s and 38539.56 s in the recording
        sunshineDurationH: expect.closeTo(1.4225, 4) as unknown,
        daylightDurationH: expect.closeTo(10.7054, 4) as unknown,
        windSpeedMaxKmh: 17.3,
        uvIndexMax: 1.65,
        weatherCode: 80,
      }),
    );
  });

  it('answers a repeated request too, keeping one place and one row per day', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
    await requestActivityRanking(app, { city: 'Chamonix' });

    // When
    const response = await requestActivityRanking(app, { city: 'Chamonix' });

    // Then
    expect(response.errors).toBeUndefined();
    expect(await readLocations(app.db)).toHaveLength(1);
    expect((await readDailyWeather(app.db)).map(({ date }) => date)).toEqual(WEEK);
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

const A_SCORE: unknown = expect.toSatisfy(
  (value) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100,
  'a whole number from 0 to 100',
);
const A_RATING: unknown = expect.toBeOneOf(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']);
const SOME_REASON: unknown = expect.arrayContaining([expect.any(String) as unknown]);
const ONE_OF_THE_WEEK: unknown = expect.toBeOneOf(WEEK);
