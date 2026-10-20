// Records the Open-Meteo responses the test fake serves (docs/testing.md#fixtures):
// `npx tsx scripts/record-fixtures.ts [file ...]`, then commit what changed in
// test/fixtures/open-meteo/. Naming files records only those places, so the others keep the
// values their tests expect.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { SEARCHES } from '../test/fixtures/open-meteo/searches.js';

const FIXTURES = join(import.meta.dirname, '../test/fixtures/open-meteo');

const only = process.argv.slice(2);

// Everything docs/design/activity-ranking.md#open-meteo-calls asks Forecast for, so that one
// recording serves every activity's scorer.
const FORECAST_DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'precipitation_sum',
  'rain_sum',
  'snowfall_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'sunshine_duration',
  'daylight_duration',
  'weather_code',
  'uv_index_max',
].join(',');

const TOP_MATCH = z.object({
  results: z
    .tuple([z.object({ latitude: z.number(), longitude: z.number(), timezone: z.string() })])
    .rest(z.unknown()),
});

for (const place of SEARCHES.filter(({ file }) => only.length === 0 || only.includes(file))) {
  const geocoding = await getJson('https://geocoding-api.open-meteo.com/v1/search', {
    name: place.name,
    count: '10',
    ...(place.countryCode === undefined ? {} : { countryCode: place.countryCode }),
  });
  await save(`geocoding-${place.file}.json`, geocoding);
  if (place.forecast === false) {
    continue;
  }

  const [top] = TOP_MATCH.parse(geocoding).results;
  const forecast = await getJson('https://api.open-meteo.com/v1/forecast', {
    latitude: String(top.latitude),
    longitude: String(top.longitude),
    daily: FORECAST_DAILY,
    hourly: 'snow_depth',
    timezone: top.timezone,
    forecast_days: '7',
  });
  await save(`forecast-${place.file}.json`, forecast);
}

async function getJson(url: string, parameters: Record<string, string>): Promise<unknown> {
  const response = await fetch(`${url}?${new URLSearchParams(parameters).toString()}`);
  if (!response.ok) {
    throw new Error(`${url} answered ${String(response.status)}: ${await response.text()}`);
  }
  return response.json();
}

async function save(file: string, body: unknown): Promise<void> {
  await writeFile(join(FIXTURES, file), `${JSON.stringify(body, null, 2)}\n`);
}
