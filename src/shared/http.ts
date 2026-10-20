import type { z } from 'zod';

/** GETs a JSON resource and checks it against its schema, the boundary for data from outside. */
export async function getJson<T>(url: URL, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url);
  return schema.parse(await response.json());
}
