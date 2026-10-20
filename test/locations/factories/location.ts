import { locations, type Database } from '../../../src/db/index.js';

export function readLocations(db: Database) {
  return db.select().from(locations);
}
