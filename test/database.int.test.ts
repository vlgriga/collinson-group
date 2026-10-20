import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { createTestApp } from './app.js';
import { fixedClock } from './fakes/clock.js';

describe('the test database', () => {
  it.each(['first', 'second'] as const)(
    'holds only what the %s test wrote, whichever ran before',
    async (writer) => {
      // Given
      const app = await createTestApp({ clock: fixedClock('2026-10-18T09:00:00Z') });
      await app.db.execute(sql`CREATE TABLE IF NOT EXISTS probe (writer text NOT NULL)`);

      // When
      await app.db.execute(sql`INSERT INTO probe (writer) VALUES (${writer})`);

      // Then
      const { rows } = await app.db.execute(sql`SELECT writer FROM probe`);
      expect(rows).toEqual([{ writer }]);
    },
  );
});
