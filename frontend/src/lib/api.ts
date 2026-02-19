const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Authenticated fetch wrapper for dashboard API calls.
 * Reads the JWT from the NextAuth session cookie and attaches it as a Bearer token.
 */
export async function authFetch(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

/**
 * Helper to call the API and parse JSON response.
 * Throws an error with the API error detail on failure.
 */
export async function authFetchJSON<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await authFetch(path, options, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
