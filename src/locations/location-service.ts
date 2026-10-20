import type { Location, LocationResolver } from '../ranking/index.js';
import type { GeocodingClient } from './geocoding-client.js';
import type { LocationRepository } from './location-repository.js';

/** Resolves a city to the geocoder's top match, and keeps the place. */
export class LocationService implements LocationResolver {
  readonly #geocoding: GeocodingClient;
  readonly #repository: LocationRepository;

  constructor(dependencies: { geocoding: GeocodingClient; repository: LocationRepository }) {
    this.#geocoding = dependencies.geocoding;
    this.#repository = dependencies.repository;
  }

  async resolve({ city }: { city: string }): Promise<Location> {
    return this.#repository.save(await this.#geocoding.search(city));
  }
}
