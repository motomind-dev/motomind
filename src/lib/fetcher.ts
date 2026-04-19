/** Fetcher SWR / preload : une seule implémentation pour les routes JSON. */
export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    throw err;
  }
  return res.json() as Promise<T>;
}
