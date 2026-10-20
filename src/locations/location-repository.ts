import { eq } from 'drizzle-orm';

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

  /** Stores a place the first time it is seen; a place already stored is kept as it is. */
  async save(place: GeocodedPlace): Promise<Location> {
    await this.#db
      .insert(locations)
      .values(place)
      .onConflictDoNothing({ target: locations.geocodingId });
    const [location] = await this.#db
      .select(LOCATION)
      .from(locations)
      .where(eq(locations.geocodingId, place.geocodingId));
    if (location === undefined) {
      throw new Error('A place just stored was not found');
    }
    return location;
  }
}
