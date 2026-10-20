import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export type Database = NodePgDatabase;

export type DatabaseConnection = {
  db: Database;
  /** Waits for the queries in flight, then closes every connection of the pool; safe to repeat. */
  close: () => Promise<void>;
};

export function connectDatabase(url: string): DatabaseConnection {
  const pool = new pg.Pool({ connectionString: url });
  // pg refuses a second end(); a shutdown asked for twice gets the first one's outcome.
  let closing: Promise<void> | undefined;
  return { db: drizzle({ client: pool }), close: () => (closing ??= pool.end()) };
}
