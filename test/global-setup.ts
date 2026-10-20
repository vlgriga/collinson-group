import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

import { TEMPLATE_DATABASE, withDatabase } from './database.js';

const run = promisify(execFile);

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
  try {
    await createTemplate(serverUrl, root.config.root);
  } catch (error) {
    // Vitest gets no teardown from a setup that throws.
    await container.stop();
    throw error;
  }

  // Given to those levels alone: what the root provides, every project sees, unit included.
  for (const level of levels) {
    level.provide('postgresUrl', serverUrl);
  }
  return async () => {
    await container.stop();
  };
}

/**
 * Migrated by `drizzle-kit migrate`, the command production runs, so the tests also prove the
 * migrations apply. It has exited before any worker copies the template, which Postgres refuses
 * while somebody is connected to it.
 */
async function createTemplate(serverUrl: string, projectRoot: string): Promise<void> {
  const server = new pg.Client({ connectionString: serverUrl });
  await server.connect();
  try {
    await server.query(`CREATE DATABASE ${TEMPLATE_DATABASE}`);
  } finally {
    await server.end();
  }
  await run(join(projectRoot, 'node_modules/.bin/drizzle-kit'), ['migrate'], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: withDatabase(serverUrl, TEMPLATE_DATABASE) },
  });
}
