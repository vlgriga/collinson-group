import { describe, expect, it } from 'vitest';

import { createTestApp } from '../app.js';
import { fixedClock } from '../fakes/clock.js';
import { readLocationAliases, readLocations } from '../locations/factories/location.js';
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

  it('resolves a city some of whose lower-ranked matches have no country', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Victoria' });

    // Then
    expect(response.data?.activityRanking.location).toEqual(
      expect.objectContaining({ name: 'Vitória', country: 'Brazil' }),
    );
  });

  it('limits the match to the country code given: Paris in US is Paris, Texas', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Paris', countryCode: 'US' });

    // Then
    expect(response.data?.activityRanking.location).toEqual({
      name: 'Paris',
      country: 'United States',
      countryCode: 'US',
      admin1: 'Texas',
      latitude: 33.66094,
      longitude: -95.55551,
      elevation: 183,
      timezone: 'America/Chicago',
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

  it('scores as many days as asked for, and sums up the week over them alone', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Chamonix', days: 3 });

    // Then
    const [outdoor] = response.data?.activityRanking.activities ?? [];
    const scores = outdoor?.days.map(({ score }) => score) ?? [];
    // In the recording, the week's best day is the 7th and its mean differs from the 3 days'.
    expect(outdoor).toEqual({
      activity: 'OUTDOOR_SIGHTSEEING',
      score: Math.round(scores.reduce((sum, score) => sum + score, 0) / 3),
      bestDay: expect.toBeOneOf(WEEK.slice(0, 3)) as unknown,
      days: WEEK.slice(0, 3).map((date) => expect.objectContaining({ date }) as unknown),
    });
  });

  it.each(INVALID_INPUTS)(
    'answers BAD_USER_INPUT for $input, storing nothing and asking Open-Meteo nothing',
    async ({ variables }) => {
      // Given
      const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

      // When
      const response = await requestActivityRanking(app, variables);

      // Then
      expect(response.errors?.map(({ extensions }) => extensions?.code)).toEqual([
        'BAD_USER_INPUT',
      ]);
      expect(await readLocations(app.db)).toEqual([]);
      expect(app.openMeteo.requests).toEqual([]);
    },
  );

  it('answers LOCATION_NOT_FOUND for a city the geocoder does not know, storing nothing', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Nowhereville' });

    // Then
    expect(response.errors?.map(({ extensions }) => extensions?.code)).toEqual([
      'LOCATION_NOT_FOUND',
    ]);
    expect(await readLocations(app.db)).toEqual([]);
  });

  it('names an unknown city as the client wrote it', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Nowhereville' });

    // Then
    expect(response.errors?.[0]?.message).toContain('Nowhereville');
  });

  it('answers LOCATION_NOT_FOUND for a city known only outside the country given', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });

    // When
    const response = await requestActivityRanking(app, { city: 'Chamonix', countryCode: 'US' });

    // Then
    expect(response.errors?.map(({ extensions }) => extensions?.code)).toEqual([
      'LOCATION_NOT_FOUND',
    ]);
  });

  it('answers a name asked for before, in another case and spacing, without geocoding it again', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
    await requestActivityRanking(app, { city: 'Chamonix Mont Blanc' });

    // When
    const response = await requestActivityRanking(app, { city: '  chamonix   MONT blanc ' });

    // Then
    expect(response.data?.activityRanking.location.name).toBe('Chamonix');
    expect(app.openMeteo.requestsTo('geocoding')).toHaveLength(1);
  });

  it('geocodes a name asked for before again when the country code differs', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
    await requestActivityRanking(app, { city: 'Paris' });

    // When
    const response = await requestActivityRanking(app, { city: 'Paris', countryCode: 'US' });

    // Then
    expect(response.data?.activityRanking.location).toEqual(
      expect.objectContaining({ countryCode: 'US', admin1: 'Texas' }),
    );
    expect(app.openMeteo.requestsTo('geocoding')).toHaveLength(2);
  });

  it('keeps one place for a second name the geocoder resolves to it, remembering both names', async () => {
    // Given
    const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
    await requestActivityRanking(app, { city: 'Chamonix' });

    // When
    const response = await requestActivityRanking(app, { city: 'Chamonix Mont Blanc' });

    // Then
    expect(response.data?.activityRanking.location.name).toBe('Chamonix');
    const [chamonix, ...others] = await readLocations(app.db);
    expect(others).toEqual([]);
    expect(await readLocationAliases(app.db)).toEqual([
      expect.objectContaining({
        normalizedQuery: 'chamonix',
        countryCode: '',
        locationId: chamonix?.id,
      }),
      expect.objectContaining({
        normalizedQuery: 'chamonix mont blanc',
        countryCode: '',
        locationId: chamonix?.id,
      }),
    ]);
  });

  it.each(UPSTREAM_FAILURES)(
    'answers UPSTREAM_UNAVAILABLE when $api fails with $failing, asking it only once',
    async ({ api, failure }) => {
      // Given
      const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
      app.openMeteo.fail(api, failure);

      // When
      const response = await requestActivityRanking(app, { city: 'Chamonix' });

      // Then
      expect(response.errors?.map(({ extensions }) => extensions?.code)).toEqual([
        'UPSTREAM_UNAVAILABLE',
      ]);
      expect(app.openMeteo.requestsTo(api)).toHaveLength(1);
    },
  );

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

const INVALID_INPUTS = [
  { input: 'an empty city', variables: { city: '' } },
  { input: 'a city of spaces only', variables: { city: '   ' } },
  { input: 'a city of 101 characters', variables: { city: 'a'.repeat(101) } },
  { input: 'a three-letter country code', variables: { city: 'Paris', countryCode: 'USA' } },
  { input: 'a one-letter country code', variables: { city: 'Paris', countryCode: 'U' } },
  { input: '0 days', variables: { city: 'Paris', days: 0 } },
  { input: '8 days', variables: { city: 'Paris', days: 8 } },
] as const;

const UPSTREAM_FAILURES = [
  { api: 'geocoding', failing: 'an error status', failure: { status: 500 } },
  { api: 'geocoding', failing: 'a broken connection', failure: 'broken connection' },
  {
    api: 'geocoding',
    failing: 'a response that fails validation',
    failure: { body: { results: [{ name: 'Chamonix' }] } },
  },
  { api: 'forecast', failing: 'an error status', failure: { status: 500 } },
  { api: 'forecast', failing: 'a broken connection', failure: 'broken connection' },
  {
    api: 'forecast',
    failing: 'a response that fails validation',
    failure: { body: { daily: { time: ['2026-10-18'] } } },
  },
] as const;

const A_SCORE: unknown = expect.toSatisfy(
  (value) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100,
  'a whole number from 0 to 100',
);
const A_RATING: unknown = expect.toBeOneOf(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']);
const SOME_REASON: unknown = expect.arrayContaining([expect.any(String) as unknown]);
const ONE_OF_THE_WEEK: unknown = expect.toBeOneOf(WEEK);
