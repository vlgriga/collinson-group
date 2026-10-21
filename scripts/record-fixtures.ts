// Records the Open-Meteo responses the test fake serves (docs/testing.md#fixtures):
// `npx tsx scripts/record-fixtures.ts [name ...]`, then commit what changed in
// test/fixtures/open-meteo/. Naming a place's file, such as `chamonix`, records only its
// recordings, and naming one recording, such as `marine-chamonix`, only that one, so the others
// keep the values their tests expect.
import { readFile, writeFile } from 'node:fs/promises';
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

// Everything the design asks Marine for, likewise.
const MARINE_DAILY = [
  'wave_height_max',
  'wave_period_max',
  'wave_direction_dominant',
  'swell_wave_height_max',
  'swell_wave_period_max',
  'wind_wave_height_max',
].join(',');

const TOP_MATCH = z.object({
  results: z
    .tuple([z.object({ latitude: z.number(), longitude: z.number(), timezone: z.string() })])
    .rest(z.unknown()),
});

for (const place of SEARCHES) {
  const wanted = (recording: string): boolean =>
    only.length === 0 || only.includes(place.file) || only.includes(`${recording}-${place.file}`);

  if (wanted('geocoding')) {
    await save(
      `geocoding-${place.file}.json`,
      await getJson('https://geocoding-api.open-meteo.com/v1/search', {
        name: place.name,
        count: '10',
        ...(place.countryCode === undefined ? {} : { countryCode: place.countryCode }),
      }),
    );
  }
  if (place.forecast === false) {
    continue;
  }

  // Read from the recording, so that a forecast recorded alone is for the place the fake finds.
  const [top] = TOP_MATCH.parse(await load(`geocoding-${place.file}.json`)).results;
  const at = {
    latitude: String(top.latitude),
    longitude: String(top.longitude),
    timezone: top.timezone,
    forecast_days: '7',
  };
  if (wanted('forecast')) {
    await save(
      `forecast-${place.file}.json`,
      await getJson('https://api.open-meteo.com/v1/forecast', {
        ...at,
        daily: FORECAST_DAILY,
        hourly: 'snow_depth',
      }),
    );
  }
  if (wanted('marine')) {
    await save(
      `marine-${place.file}.json`,
      await getJson('https://marine-api.open-meteo.com/v1/marine', { ...at, daily: MARINE_DAILY }),
    );
  }
}

async function getJson(url: string, parameters: Record<string, string>): Promise<unknown> {
  const response = await fetch(`${url}?${new URLSearchParams(parameters).toString()}`);
  if (!response.ok) {
    throw new Error(`${url} answered ${String(response.status)}: ${await response.text()}`);
  }
  return response.json();
}

async function load(file: string): Promise<unknown> {
  return JSON.parse(await readFile(join(FIXTURES, file), 'utf8'));
}

async function save(file: string, body: unknown): Promise<void> {
  await writeFile(join(FIXTURES, file), `${JSON.stringify(body, null, 2)}\n`);
}
