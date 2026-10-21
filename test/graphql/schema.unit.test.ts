import { readFileSync } from 'node:fs';

import { assertEnumType, buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';

import { ACTIVITIES } from '../../src/scoring/index.js';

const SCHEMA = new URL('../../src/graphql/schema.graphql', import.meta.url);

describe('schema Activity', () => {
  it('lists the activities in the order a tie in weekly score keeps', () => {
    // Given
    const schema = buildSchema(readFileSync(SCHEMA, 'utf8'));

    // When
    const activities = assertEnumType(schema.getType('Activity')).getValues();

    // Then
    expect(activities.map(({ name }) => name)).toEqual(ACTIVITIES);
  });
});
