import type { z } from 'zod';

import { UpstreamUnavailableError } from './errors.js';

/** What an upstream answered: the body as it was sent, and as its schema reads it. */
export type JsonResponse<T> = {
  payload: unknown;
  data: T;
};

/**
 * GETs a JSON resource and checks it against `schema`. A request that fails, an error status, or
 * a body that is not JSON or not of the schema is an UpstreamUnavailableError.
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
  if (!response.ok) {
    // Read or cancelled, a body frees its connection.
    await response.body?.cancel();
    throw new UpstreamUnavailableError(`${upstream} answered ${String(response.status)}`);
  }
  const payload: unknown = await response.json().catch((error: unknown) => {
    throw new UpstreamUnavailableError(`${upstream} answered with a body that is not JSON`, {
      cause: error,
    });
  });
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new UpstreamUnavailableError(`${upstream} answered in an unexpected shape`, {
      cause: result.error,
    });
  }
  return { payload, data: result.data };
}
