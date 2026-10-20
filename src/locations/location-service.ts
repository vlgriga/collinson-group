import type { Location, LocationResolver } from '../ranking/index.js';
import type { GeocodingClient } from './geocoding-client.js';

/** Resolves a city to the geocoder's top match. */
export class LocationService implements LocationResolver {
  readonly #geocoding: GeocodingClient;

  constructor({ geocoding }: { geocoding: GeocodingClient }) {
    this.#geocoding = geocoding;
  }

  resolve({ city }: { city: string }): Promise<Location> {
    return this.#geocoding.search(city);
  }
}
