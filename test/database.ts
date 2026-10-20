import pg from 'pg';
import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    /** The run's Postgres server, given only to the projects whose tests reach a database. */
    postgresUrl?: string;
  }
}

/** Migrated once per run by global-setup.ts; never connected to by a test. */
export const TEMPLATE_DATABASE = 'template_migrated';

let workerDatabase: Promise<string> | undefined;

/**
 * This worker's database, emptied. Asking for it is what gives a test storage
 * (docs/testing.md#environment).
 */
export async function useDatabase(): Promise<string> {
  const url = await (workerDatabase ??= createWorkerDatabase());
  await emptyEveryTable(url);
  return url;
}

export function withDatabase(serverUrl: string, database: string): string {
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  return url.href;
}

/** Copies the template for this worker, unless an earlier test file of the worker already has. */
async function createWorkerDatabase(): Promise<string> {
  const serverUrl = inject('postgresUrl');
  if (serverUrl === undefined) {
    throw new Error(
      'No database in a unit run: a test that needs one ends in .int.test.ts or .e2e.test.ts',
    );
  }
  // Vitest numbers its workers from 1 and sets the variable in every one of them.
  const database = `test_${process.env.VITEST_POOL_ID ?? '1'}`;
  const server = new pg.Client({ connectionString: serverUrl });
  await server.connect();
  try {
    const existing = await server.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (existing.rowCount === 0) {
      await server.query(`CREATE DATABASE ${database} TEMPLATE ${TEMPLATE_DATABASE}`);
    }
  } finally {
    await server.end();
  }
  return withDatabase(serverUrl, database);
}

/**
 * Read from the catalogue every time, so a table a migration adds is emptied without a list to
 * keep. Only `public` so far: pg-boss's tables join when the queue is wired
 * (docs/testing.md#environment), all but its `version` table: emptying that one uninstalls pg-boss.
 */
async function emptyEveryTable(url: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      `SELECT format('%I.%I', schemaname, tablename) AS name FROM pg_tables WHERE schemaname = 'public'`,
    );
    if (rows.length > 0) {
      await client.query(
        `TRUNCATE ${rows.map(({ name }) => name).join(', ')} RESTART IDENTITY CASCADE`,
      );
    }
  } finally {
    await client.end();
  }
}
