import { readFileSync } from 'node:fs';

import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

import { SEARCHES } from '../fixtures/open-meteo/searches.js';

const FIXTURES = new URL('../fixtures/open-meteo/', import.meta.url);

const ENDPOINTS = {
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  marine: 'https://marine-api.open-meteo.com/v1/marine',
} as const;

export type OpenMeteoApi = keyof typeof ENDPOINTS;

/** How an API the test tells to fail answers (docs/testing.md#fault-injection). */
export type OpenMeteoFailure =
  | { status: number }
  | 'broken connection'
  /** A 200 whose body is whatever the test gives, such as one the client must refuse. */
  | { body: JsonBodyType }
  /**
   * The recorded forecast, or marine forecast, for the dates from `from` to `to`, whatever was
   * asked for: such as a week without today, as a provider with no forecast for the place's today
   * yet answers (ADR 0009).
   */
  | { dates: { from: string; to: string } }
  /** The recorded forecast as asked, its hours those of the dates from `from` to `to` instead. */
  | { hourDates: { from: string; to: string } };

const GEOCODING = z.looseObject({
  results: z
    .tuple([z.looseObject({ latitude: z.number(), longitude: z.number() })])
    .rest(z.unknown()),
});
/** Variables of one time step, each a value per `time`. */
const SERIES = z
  .record(z.string(), z.array(z.unknown()))
  .and(z.object({ time: z.array(z.string()) }));
const FORECAST = z.looseObject({ daily: SERIES, hourly: SERIES });
const MARINE = z.looseObject({ daily: SERIES });

type Search = {
  /** Lower-cased: Open-Meteo matches a name without regard to case. */
  name: string;
  countryCode: string | undefined;
  file: string;
  forecast: boolean;
  geocoding: z.infer<typeof GEOCODING>;
};

/** A place the fake has the forecasts of, found by its coordinates as Geocoding gave them. */
type Place = {
  latitude: number;
  longitude: number;
  forecast: z.infer<typeof FORECAST>;
  marine: z.infer<typeof MARINE>;
};

/**
 * Open-Meteo, answered from the recorded fixtures (docs/testing.md#isolating-dependencies). A
 * request it has no answer for fails the test rather than reaching the real API.
 */
export class OpenMeteoFake {
  /** Every request received, in order. */
  readonly requests: URL[] = [];

  readonly #failures = new Map<OpenMeteoApi, OpenMeteoFailure>();

  readonly #searches: Search[] = SEARCHES.map(({ name, countryCode, file, forecast }) => ({
    name: name.toLowerCase(),
    countryCode,
    file,
    forecast: forecast !== false,
    geocoding: GEOCODING.parse(readFixture(`geocoding-${file}.json`)),
  }));

  readonly #places: Place[] = this.#searches
    .filter(({ forecast }) => forecast)
    .map(({ file, geocoding }) => {
      const [top] = geocoding.results;
      return {
        latitude: top.latitude,
        longitude: top.longitude,
        forecast: FORECAST.parse(readFixture(`forecast-${file}.json`)),
        marine: MARINE.parse(readFixture(`marine-${file}.json`)),
      };
    });

  readonly #server = setupServer(
    http.get(ENDPOINTS.geocoding, ({ request }) =>
      this.#answer('geocoding', request, (url) => this.#geocode(url)),
    ),
    http.get(ENDPOINTS.forecast, ({ request }) =>
      this.#answer('forecast', request, (url, hoursUrl) => this.#forecast(url, hoursUrl)),
    ),
    http.get(ENDPOINTS.marine, ({ request }) =>
      this.#answer('marine', request, (url) => this.#marine(url)),
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

  #answer(
    api: OpenMeteoApi,
    request: Request,
    answer: (url: URL, hoursUrl?: URL) => JsonBodyType,
  ): Response {
    const url = new URL(request.url);
    this.requests.push(url);
    const failure = this.#failures.get(api);
    if (failure === undefined) {
      return HttpResponse.json(answer(url));
    }
    if (failure === 'broken connection') {
      return HttpResponse.error();
    }
    if ('dates' in failure) {
      return HttpResponse.json(answer(askingFor(url, failure.dates)));
    }
    if ('hourDates' in failure) {
      return HttpResponse.json(answer(url, askingFor(url, failure.hourDates)));
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

  /**
   * The recorded days and their hours, dated from `start_date` to `end_date` as asked (ADR 0009);
   * the hours as `hoursUrl` asks, when it is given.
   */
  #forecast(url: URL, hoursUrl: URL = url): JsonBodyType {
    const { daily, hourly, ...rest } = this.#place(url).forecast;
    // Each hour of a recorded day keeps its time of day, on the date that takes the day's place.
    const hourDates = datesBetween(param(hoursUrl, 'start_date'), param(hoursUrl, 'end_date'));
    const dateFor = new Map(
      daily.time.slice(0, hourDates.length).map((date, day) => [date, hourDates[day]]),
    );
    const hours = hourly.time.flatMap((time, hour) => {
      const [date = '', timeOfDay = ''] = time.split('T');
      const asked = dateFor.get(date);
      return asked === undefined ? [] : [{ hour, time: `${asked}T${timeOfDay}` }];
    });
    const rebasedHours = Object.fromEntries(
      Object.entries(hourly).map(([key, values]) => [
        key,
        key === 'time' ? hours.map(({ time }) => time) : hours.map(({ hour }) => values[hour]),
      ]),
    );
    return { ...rest, daily: rebaseDays(url, daily), hourly: rebasedHours };
  }

  /** The recorded days of the place's sea, dated from `start_date` to `end_date` as asked. */
  #marine(url: URL): JsonBodyType {
    const { daily, ...rest } = this.#place(url).marine;
    return { ...rest, daily: rebaseDays(url, daily) };
  }

  /** The place at the coordinates `url` asks for; a place not recorded fails the test. */
  #place(url: URL): Place {
    const place = this.#places.find(
      ({ latitude, longitude }) =>
        latitude === Number(url.searchParams.get('latitude')) &&
        longitude === Number(url.searchParams.get('longitude')),
    );
    if (place === undefined) {
      throw new Error(`No recording for ${url.origin}${url.pathname}${url.search}`);
    }
    return place;
  }
}

/** The recorded days, dated from `start_date` to `end_date` as `url` asks (ADR 0009). */
function rebaseDays(url: URL, daily: z.infer<typeof SERIES>): Record<string, unknown[]> {
  const dates = datesBetween(param(url, 'start_date'), param(url, 'end_date'));
  return Object.fromEntries(
    Object.entries(daily).map(([key, values]) => [
      key,
      key === 'time' ? dates : values.slice(0, dates.length),
    ]),
  );
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

/** `url`, asking for the dates from `from` to `to` instead. */
function askingFor(url: URL, { from, to }: { from: string; to: string }): URL {
  const other = new URL(url);
  other.searchParams.set('start_date', from);
  other.searchParams.set('end_date', to);
  return other;
}

function datesBetween(first: string, last: string): string[] {
  const dates: string[] = [];
  for (let day = new Date(`${first}T00:00:00Z`); day <= new Date(`${last}T00:00:00Z`);) {
    dates.push(day.toISOString().slice(0, 'YYYY-MM-DD'.length));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}
