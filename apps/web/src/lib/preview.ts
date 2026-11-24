import { ApiClientError } from "./api.ts";

/** The scaffold previews its API data during development, when the feature pages are being built. */
export async function loadPreview<T>(load: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  if (process.env.NODE_ENV !== "development") return { data: null, error: null };

  try {
    return { data: await load(), error: null };
  } catch (error) {
    if (!(error instanceof ApiClientError)) throw error;
    return { data: null, error: error.message };
  }
}
