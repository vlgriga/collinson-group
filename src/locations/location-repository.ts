import { and, eq } from 'drizzle-orm';

import { locationAliases, locations, type Database } from '../db/index.js';
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

/** A name as it was geocoded, and the country the search was limited to, if one. */
export type Alias = {
  name: string;
  countryCode: string | null;
};

/** The places requests have resolved to, and the names they were found by. */
export class LocationRepository {
  readonly #db: Database;

  constructor({ db }: { db: Database }) {
    this.#db = db;
  }

  /** The place a name resolved to before, if it has been asked for. */
  async findByAlias(alias: Alias): Promise<Location | undefined> {
    const [location] = await this.#db
      .select(LOCATION)
      .from(locationAliases)
      .innerJoin(locations, eq(locationAliases.locationId, locations.id))
      .where(
        and(
          eq(locationAliases.normalizedQuery, alias.name),
          eq(locationAliases.countryCode, aliasCountryCode(alias)),
        ),
      );
    return location;
  }

  /**
   * Stores a place the first time it is seen, and the name it was found by; a place already stored
   * is kept as it is, and takes the name too.
   */
  async save(place: GeocodedPlace, alias: Alias): Promise<Location> {
    return this.#db.transaction(async (tx) => {
      await tx
        .insert(locations)
        .values(place)
        .onConflictDoNothing({ target: locations.geocodingId });
      const [location] = await tx
        .select(LOCATION)
        .from(locations)
        .where(eq(locations.geocodingId, place.geocodingId));
      if (location === undefined) {
        throw new Error('A place just stored was not found');
      }
      // A simultaneous first request for the same name may have stored it already.
      await tx
        .insert(locationAliases)
        .values({
          normalizedQuery: alias.name,
          countryCode: aliasCountryCode(alias),
          locationId: location.id,
        })
        .onConflictDoNothing();
      return location;
    });
  }
}

function aliasCountryCode({ countryCode }: Alias): string {
  return countryCode ?? '';
}
