import type { GraphQLError } from 'graphql';
import { createGraphQLError, maskError } from 'graphql-yoga';

import {
  LocationNotFoundError,
  UpstreamUnavailableError,
  ValidationError,
} from '../shared/index.js';

/** The response code of each domain error (docs/architecture/error-handling.md). */
const CODES = [
  [ValidationError, 'BAD_USER_INPUT'],
  [LocationNotFoundError, 'LOCATION_NOT_FOUND'],
  [UpstreamUnavailableError, 'UPSTREAM_UNAVAILABLE'],
] as const;

/**
 * Where an error becomes a response: a domain error keeps its message and gets its code; anything
 * else is masked by Yoga as INTERNAL_SERVER_ERROR, its details kept from the client.
 */
export function maskDomainError(error: unknown, message: string, isDev?: boolean): Error {
  // A resolver's error arrives wrapped, with where in the query it was thrown.
  if (isGraphQLError(error) && error.cause instanceof Error) {
    const { cause } = error;
    const code = CODES.find(([type]) => cause instanceof type)?.[1];
    if (code !== undefined) {
      return createGraphQLError(cause.message, {
        nodes: error.nodes ?? null,
        source: error.source,
        positions: error.positions,
        path: error.path,
        originalError: cause,
        extensions: { code },
      });
    }
  }
  return maskError(error, message, isDev);
}

/**
 * By its name, as Yoga tells one: `instanceof` fails when graphql is loaded twice, as under Vitest,
 * which resolves it for this module with the `development` condition and for Yoga without.
 */
function isGraphQLError(error: unknown): error is GraphQLError {
  return error instanceof Error && error.name === 'GraphQLError';
}
