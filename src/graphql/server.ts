import { readFileSync } from 'node:fs';

import { createSchema, createYoga, type YogaServerInstance } from 'graphql-yoga';

import type { RankingService } from '../ranking/index.js';
import { createResolvers } from './resolvers.js';

// Read where it lies, so that the SDL codegen reads is the one served; the build copies it.
const TYPE_DEFS = readFileSync(new URL('schema.graphql', import.meta.url), 'utf8');

export type GraphqlServer = YogaServerInstance<object, object>;

export function createGraphqlServer(ranking: RankingService): GraphqlServer {
  return createYoga({
    schema: createSchema({ typeDefs: TYPE_DEFS, resolvers: createResolvers(ranking) }),
  });
}
