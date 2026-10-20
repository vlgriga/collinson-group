import { createGraphQLError } from 'graphql-yoga';

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
 * Where an error becomes a response. A domain error becomes a GraphQL error with its message and
 * code, which Yoga passes on as it is. Anything else is left to Yoga, which logs it and masks it as
 * INTERNAL_SERVER_ERROR. Mapped in Yoga's error mask instead, every domain error would be logged at
 * error level, client faults included.
 */
export function toResponseError(error: unknown): unknown {
  for (const [type, code] of CODES) {
    if (error instanceof type) {
      // Without the domain error as its originalError: Yoga masks an error whose chain does not end
      // in a GraphQL error.
      return createGraphQLError(error.message, { extensions: { code } });
    }
  }
  return error;
}
