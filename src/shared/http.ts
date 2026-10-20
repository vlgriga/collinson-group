/** GETs a JSON resource as it is sent; the caller checks it against its schema. */
export async function getJson(url: URL): Promise<unknown> {
  const response = await fetch(url);
  return response.json();
}
