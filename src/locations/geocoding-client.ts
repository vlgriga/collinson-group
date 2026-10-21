import { z } from 'zod';

import type { Location } from '../ranking/index.js';
import { getJson } from '../shared/index.js';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// docs/design/activity-ranking.md#open-meteo-calls; only the top match is taken (ADR 0003).
const CANDIDATES = '10';

const PLACE = z.object({
  id: z.int(),
  name: z.string(),
  country: z.string(),
  country_code: z.string(),
  admin1: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  timezone: z.string(),
});

const RESPONSE = z.object({
  // Absent when nothing matches. Only the match taken is checked: a lower-ranked one may lack a
  // country, and is no reason to fail.
  results: z.tuple([PLACE]).rest(z.unknown()).optional(),
});

/** A place as the geocoder knows it, before it is stored. */
export type GeocodedPlace = Omit<Location, 'id'> & {
  /** The geocoder's own id: two names for one place share it. */
  geocodingId: number;
};

/** Open-Meteo Geocoding: a name to the place it most likely means. */
export class GeocodingClient {
  /**
   * The place `name` most likely means, in the country of `countryCode` when one is given;
   * undefined when the geocoder knows none.
   */
  async search(name: string, countryCode: string | null): Promise<GeocodedPlace | undefined> {
    const url = new URL(SEARCH_URL);
    url.search = new URLSearchParams({
      name,
      count: CANDIDATES,
      ...(countryCode === null ? {} : { countryCode }),
    }).toString();
    const top = (await getJson(url, RESPONSE)).data.results?.[0];
    if (top === undefined) {
      return undefined;
    }
    return {
      geocodingId: top.id,
      name: top.name,
      country: top.country,
      countryCode: top.country_code,
      admin1: top.admin1 ?? null,
      latitude: top.latitude,
      longitude: top.longitude,
      elevationM: top.elevation ?? null,
      timezone: top.timezone,
    };
  }
}
