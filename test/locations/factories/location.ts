import { asc } from 'drizzle-orm';

import { locationAliases, locations, type Database } from '../../../src/db/index.js';

export function readLocations(db: Database) {
  return db.select().from(locations);
}

/** Every remembered name, in alphabetical order. */
export function readLocationAliases(db: Database) {
  return db.select().from(locationAliases).orderBy(asc(locationAliases.normalizedQuery));
}
