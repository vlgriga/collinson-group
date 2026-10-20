import { readFileSync } from 'node:fs';

import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

const FIXTURES = new URL('../fixtures/open-meteo/', import.meta.url);

/** The places the fake knows: the name a request gives, and the files it is answered from. */
const PLACES = [
  { name: 'chamonix', file: 'chamonix' },
  { name: 'victoria', file: 'victoria' },
] as const;

const GEOCODING = z.looseObject({
  results: z
    .tuple([z.looseObject({ latitude: z.number(), longitude: z.number() })])
    .rest(z.unknown()),
});
const FORECAST = z.looseObject({ daily: z.record(z.string(), z.array(z.unknown())) });

type Place = {
  name: string;
  latitude: number;
  longitude: number;
  geocoding: z.infer<typeof GEOCODING>;
  forecast: z.infer<typeof FORECAST>;
};

/**
 * Open-Meteo, answered from the recorded fixtures (docs/testing.md#isolating-dependencies). A
 * request it has no answer for fails the test rather than reaching the real API.
 */
export class OpenMeteoFake {
  /** Every request received, in order. */
  readonly requests: URL[] = [];

  readonly #places: Place[] = PLACES.map(({ name, file }) => {
    const geocoding = GEOCODING.parse(readFixture(`geocoding-${file}.json`));
    const [top] = geocoding.results;
    const forecast = FORECAST.parse(readFixture(`forecast-${file}.json`));
    return { name, latitude: top.latitude, longitude: top.longitude, geocoding, forecast };
  });

  readonly #server = setupServer(
    http.get('https://geocoding-api.open-meteo.com/v1/search', ({ request }) =>
      HttpResponse.json(this.#geocode(this.#receive(request))),
    ),
    http.get('https://api.open-meteo.com/v1/forecast', ({ request }) =>
      HttpResponse.json(this.#forecast(this.#receive(request))),
    ),
  );

  listen(): void {
    this.#server.listen({ onUnhandledFrame: 'error' });
  }

  close(): void {
    this.#server.close();
  }

  #receive(request: Request): URL {
    const url = new URL(request.url);
    this.requests.push(url);
    return url;
  }

  /** The recorded answer for a known name; for any other, no results, as Open-Meteo answers. */
  #geocode(url: URL): JsonBodyType {
    const name = url.searchParams.get('name')?.toLowerCase();
    const place = this.#places.find((known) => known.name === name);
    return place?.geocoding ?? { generationtime_ms: 0.1 };
  }

  /** The recorded days, dated from `start_date` to `end_date` as asked (ADR 0009). */
  #forecast(url: URL): JsonBodyType {
    const place = this.#places.find(
      ({ latitude, longitude }) =>
        latitude === Number(url.searchParams.get('latitude')) &&
        longitude === Number(url.searchParams.get('longitude')),
    );
    if (place === undefined) {
      throw new Error(`No recorded forecast for ${url.search}`);
    }
    const dates = datesBetween(param(url, 'start_date'), param(url, 'end_date'));
    const { daily, ...rest } = place.forecast;
    const rebased = Object.fromEntries(
      Object.entries(daily).map(([key, values]) => [
        key,
        key === 'time' ? dates : values.slice(0, dates.length),
      ]),
    );
    // The recorded hours keep the recording's dates; nothing asks for them yet.
    const dailyOnly = Object.fromEntries(
      Object.entries(rest).filter(([key]) => !key.startsWith('hourly')),
    );
    return { ...dailyOnly, daily: rebased };
  }
}

function readFixture(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8'));
}

function param(url: URL, name: string): string {
  const value = url.searchParams.get(name);
  if (value === null) {
    throw new Error(`The fake answers only for an explicit ${name}`);
  }
  return value;
}

function datesBetween(first: string, last: string): string[] {
  const dates: string[] = [];
  for (let day = new Date(`${first}T00:00:00Z`); day <= new Date(`${last}T00:00:00Z`);) {
    dates.push(day.toISOString().slice(0, 'YYYY-MM-DD'.length));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}
