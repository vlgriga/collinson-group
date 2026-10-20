import type { z } from 'zod';

import { UpstreamUnavailableError } from './errors.js';

/** What an upstream answered: the body as it was sent, and as its schema reads it. */
export type JsonResponse<T> = {
  payload: unknown;
  data: T;
};

/**
 * GETs a JSON resource and checks it against `schema`. A request that fails, a body that breaks
 * off, an error status, or a body that is not JSON or not of the schema is an
 * UpstreamUnavailableError.
 */
export async function getJson<Schema extends z.ZodType>(
  url: URL,
  schema: Schema,
): Promise<JsonResponse<z.output<Schema>>> {
  // Named without its query, which holds what the client asked for.
  const upstream = `${url.host}${url.pathname}`;
  const response = await fetch(url).catch((error: unknown) => {
    throw new UpstreamUnavailableError(`${upstream} could not be reached`, { cause: error });
  });
  // Read whatever the status: a body left unread holds its connection until it is collected.
  const body = await response.text().catch((error: unknown) => {
    throw new UpstreamUnavailableError(`${upstream} broke off its answer`, { cause: error });
  });
  if (!response.ok) {
    throw new UpstreamUnavailableError(`${upstream} answered ${String(response.status)}`);
  }
  const payload = parseJson(body, upstream);
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new UpstreamUnavailableError(`${upstream} answered in an unexpected shape`, {
      cause: result.error,
    });
  }
  return { payload, data: result.data };
}

function parseJson(body: string, upstream: string): unknown {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new UpstreamUnavailableError(`${upstream} answered with a body that is not JSON`, {
      cause: error,
    });
  }
}
