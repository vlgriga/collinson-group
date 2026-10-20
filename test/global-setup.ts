import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

import { TEMPLATE_DATABASE, withDatabase } from './database.js';

// The same major version as production (docs/testing.md#principles).
const POSTGRES_IMAGE = 'postgres:17-alpine';
// The projects of vitest.config.ts whose tests reach a database.
const LEVELS_WITH_A_DATABASE = new Set(['integration', 'e2e']);

/**
 * Starts the run's Postgres and migrates the template every worker's database is copied from;
 * a run of the unit level alone starts nothing.
 */
export async function setup(root: TestProject): Promise<(() => Promise<void>) | undefined> {
  const levels = root.vitest.projects.filter(({ name }) => LEVELS_WITH_A_DATABASE.has(name));
  if (levels.length === 0) {
    return undefined;
  }
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const serverUrl = container.getConnectionUri();

  const server = new pg.Client({ connectionString: serverUrl });
  await server.connect();
  try {
    await server.query(`CREATE DATABASE ${TEMPLATE_DATABASE}`);
  } finally {
    await server.end();
  }

  // The client is closed before any worker copies the template: Postgres refuses to copy a
  // database somebody is connected to.
  const template = new pg.Client({ connectionString: withDatabase(serverUrl, TEMPLATE_DATABASE) });
  await template.connect();
  try {
    await migrate(drizzle({ client: template }), { migrationsFolder: 'src/db/migrations' });
  } finally {
    await template.end();
  }

  // Given to those levels alone: what the root provides, every project sees, unit included.
  for (const level of levels) {
    level.provide('postgresUrl', serverUrl);
  }
  return async () => {
    await container.stop();
  };
}
