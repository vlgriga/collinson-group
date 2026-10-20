import { locations, type Database } from '../db/index.js';
import type { Location } from '../ranking/index.js';
import type { GeocodedPlace } from './geocoding-client.js';

/** The columns a Location is read from. */
const LOCATION = {
  id: locations.id,
  name: locations.name,
  country: locations.country,
  countryCode: locations.countryCode,
  admin1: locations.admin1,
  latitude: locations.latitude,
  longitude: locations.longitude,
  elevationM: locations.elevationM,
  timezone: locations.timezone,
};

/** The places requests have resolved to. */
export class LocationRepository {
  readonly #db: Database;

  constructor({ db }: { db: Database }) {
    this.#db = db;
  }

  async save(place: GeocodedPlace): Promise<Location> {
    const [location] = await this.#db.insert(locations).values(place).returning(LOCATION);
    if (location === undefined) {
      throw new Error('An insert returned no row');
    }
    return location;
  }
}
