/**
 * Minimal typed fetch wrapper for the Flask API.
 *
 * With VITE_API_BASE_URL unset, paths stay relative ("/api/users") and the Vite
 * dev proxy forwards them to Flask. Set it to an absolute origin to talk to a
 * deployed API directly — the Flask app already allows the dev origin via CORS.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) query.set(key, String(value));
  }
  const search = query.toString();
  return `${BASE_URL}${path}${search ? `?${search}` : ""}`;
}

export async function apiGet<T>(
  path: string,
  options: { params?: Record<string, string | number | undefined>; signal?: AbortSignal } = {},
): Promise<T> {
  const url = buildUrl(path, options.params);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: options.signal,
      headers: { Accept: "application/json" },
    });
  } catch (cause) {
    // An AbortError is a cancelled request, not a failure — let it through as-is.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(
      "Could not reach the API. Is the Flask server running on port 5000?",
      0,
      url,
    );
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with ${response.status} ${response.statusText}`, response.status, url);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("The API returned a response that was not valid JSON.", response.status, url);
  }
}
