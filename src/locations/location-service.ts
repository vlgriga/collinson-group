import type { Location, LocationResolver } from '../ranking/index.js';
import { LocationNotFoundError } from '../shared/index.js';
import type { GeocodingClient } from './geocoding-client.js';
import type { LocationRepository } from './location-repository.js';

/**
 * Resolves a city to the geocoder's top match, and keeps the place and the name, so that a name
 * asked for again, in any case or spacing, is not geocoded again.
 */
export class LocationService implements LocationResolver {
  readonly #geocoding: GeocodingClient;
  readonly #repository: LocationRepository;

  constructor(dependencies: { geocoding: GeocodingClient; repository: LocationRepository }) {
    this.#geocoding = dependencies.geocoding;
    this.#repository = dependencies.repository;
  }

  async resolve({
    city,
    countryCode,
  }: {
    city: string;
    countryCode: string | null;
  }): Promise<Location> {
    // Geocoded in the form it is remembered by, so the place remembered is the geocoder's answer to
    // that very name; Open-Meteo finds nothing for a name with a run of spaces in it.
    const alias = { name: normalize(city), countryCode };
    const known = await this.#repository.findByAlias(alias);
    if (known !== undefined) {
      return known;
    }
    const place = await this.#geocoding.search(alias.name, countryCode);
    if (place === undefined) {
      throw new LocationNotFoundError(
        countryCode === null
          ? `No place named ${city}`
          : `No place named ${city} in ${countryCode}`,
      );
    }
    return this.#repository.save(place, alias);
  }
}

/** Trimmed, its spaces collapsed, lower-cased. */
function normalize(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
