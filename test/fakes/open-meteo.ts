import { readFileSync } from 'node:fs';

import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

const FIXTURES = new URL('../fixtures/open-meteo/', import.meta.url);

const ENDPOINTS = {
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
} as const;

export type OpenMeteoApi = keyof typeof ENDPOINTS;

/** How an API the test tells to fail answers (docs/testing.md#fault-injection). */
export type OpenMeteoFailure =
  | { status: number }
  | 'broken connection'
  /** A 200 whose body is whatever the test gives, such as one the client must refuse. */
  | { body: JsonBodyType };

/** The searches the fake knows, as Open-Meteo is asked them, and the files they are answered from. */
const SEARCHES: readonly { name: string; countryCode?: string; file: string }[] = [
  { name: 'chamonix', file: 'chamonix' },
  { name: 'chamonix mont blanc', file: 'chamonix-mont-blanc' },
  { name: 'victoria', file: 'victoria' },
  { name: 'paris', file: 'paris' },
  { name: 'paris', countryCode: 'US', file: 'paris-us' },
];

/** The searches whose top match has a recorded forecast; another search may find the same place. */
const FORECASTS = ['chamonix', 'victoria', 'paris', 'paris-us'] as const;

const GEOCODING = z.looseObject({
  results: z
    .tuple([z.looseObject({ latitude: z.number(), longitude: z.number() })])
    .rest(z.unknown()),
});
const FORECAST = z.looseObject({ daily: z.record(z.string(), z.array(z.unknown())) });

type Search = {
  name: string;
  countryCode: string | undefined;
  geocoding: z.infer<typeof GEOCODING>;
};

type Forecast = {
  latitude: number;
  longitude: number;
  forecast: z.infer<typeof FORECAST>;
};

/**
 * Open-Meteo, answered from the recorded fixtures (docs/testing.md#isolating-dependencies). A
 * request it has no answer for fails the test rather than reaching the real API.
 */
export class OpenMeteoFake {
  /** Every request received, in order. */
  readonly requests: URL[] = [];

  readonly #failures = new Map<OpenMeteoApi, OpenMeteoFailure>();

  readonly #searches: Search[] = SEARCHES.map(({ name, countryCode, file }) => ({
    name,
    countryCode,
    geocoding: GEOCODING.parse(readFixture(`geocoding-${file}.json`)),
  }));

  readonly #forecasts: Forecast[] = FORECASTS.map((file) => {
    const [top] = GEOCODING.parse(readFixture(`geocoding-${file}.json`)).results;
    const forecast = FORECAST.parse(readFixture(`forecast-${file}.json`));
    return { latitude: top.latitude, longitude: top.longitude, forecast };
  });

  readonly #server = setupServer(
    http.get(ENDPOINTS.geocoding, ({ request }) =>
      this.#answer('geocoding', request, (url) => this.#geocode(url)),
    ),
    http.get(ENDPOINTS.forecast, ({ request }) =>
      this.#answer('forecast', request, (url) => this.#forecast(url)),
    ),
  );

  listen(): void {
    this.#server.listen({ onUnhandledFrame: 'error' });
  }

  close(): void {
    this.#server.close();
  }

  /** From now until the test ends, every request to `api` fails the way `failure` says. */
  fail(api: OpenMeteoApi, failure: OpenMeteoFailure): void {
    this.#failures.set(api, failure);
  }

  /** The requests one API received, in order. */
  requestsTo(api: OpenMeteoApi): URL[] {
    return this.requests.filter((url) => `${url.origin}${url.pathname}` === ENDPOINTS[api]);
  }

  #answer(api: OpenMeteoApi, request: Request, answer: (url: URL) => JsonBodyType): Response {
    const url = new URL(request.url);
    this.requests.push(url);
    const failure = this.#failures.get(api);
    if (failure === undefined) {
      return HttpResponse.json(answer(url));
    }
    if (failure === 'broken connection') {
      return HttpResponse.error();
    }
    if ('status' in failure) {
      // The shape Open-Meteo gives its own errors.
      return HttpResponse.json(
        { error: true, reason: 'The test asked for a failure' },
        { status: failure.status },
      );
    }
    return HttpResponse.json(failure.body);
  }

  /**
   * The recorded answer for a known search; for any other, no results, as Open-Meteo answers.
   * The name is matched without regard to case, as Open-Meteo does; the country code exactly.
   */
  #geocode(url: URL): JsonBodyType {
    const name = url.searchParams.get('name')?.toLowerCase();
    const countryCode = url.searchParams.get('countryCode') ?? undefined;
    const search = this.#searches.find(
      (known) => known.name === name && known.countryCode === countryCode,
    );
    return search?.geocoding ?? { generationtime_ms: 0.1 };
  }

  /** The recorded days, dated from `start_date` to `end_date` as asked (ADR 0009). */
  #forecast(url: URL): JsonBodyType {
    const place = this.#forecasts.find(
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
