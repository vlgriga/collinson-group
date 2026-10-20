import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export type Database = NodePgDatabase;

export type DatabaseConnection = {
  db: Database;
  /** Waits for the queries in flight, then closes every connection of the pool. */
  close: () => Promise<void>;
};

export function connectDatabase(url: string): DatabaseConnection {
  const pool = new pg.Pool({ connectionString: url });
  return { db: drizzle({ client: pool }), close: () => pool.end() };
}
