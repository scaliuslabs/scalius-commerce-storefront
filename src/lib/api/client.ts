// src/lib/api/client.ts

/**
 * Core API Client for Scalius Commerce
 * Handles request creation, authentication, and resilient fetching.
 */

// Resolve the API base URL:
// 1. In browser: read from window.__API_BASE_URL__ set by Layout.astro's define:vars script
//    (Cloudflare Worker runtime vars are NOT available to Vite client bundles via import.meta.env)
// 2. In SSR: read from import.meta.env.PUBLIC_API_URL (available server-side)
// 3. Fallback: /api/v1 (same-origin proxy for local dev)
function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined" && (window as any).__API_BASE_URL__) {
    return (window as any).__API_BASE_URL__;
  }
  return import.meta.env.PUBLIC_API_URL || "/api/v1";
}

const API_BASE_URL = resolveApiBaseUrl();

// --- JWT Token Management ---

let jwtToken: string | null = null;
let tokenExpiry: number | null = null;
let tokenRefreshPromise: Promise<string | null> | null = null;

/**
 * Creates a valid API URL by combining the base URL and a given path.
 * @param path The API endpoint path (e.g., "/products/my-slug").
 * @returns The full URL for the API request.
 */
export function createApiUrl(path: string): string {
  // Ensure the path starts with a slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Retrieves a valid JWT token, fetching a new one if necessary.
 * This function handles token expiration and pending refresh requests.
 * @returns A promise that resolves to the JWT token or null if authentication fails.
 */
async function getJwtToken(): Promise<string | null> {
  const isExpiredOrExpiring =
    !jwtToken || !tokenExpiry || Date.now() > tokenExpiry - 5 * 60 * 1000;

  if (!isExpiredOrExpiring) {
    return jwtToken;
  }

  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      const apiToken = import.meta.env.API_TOKEN;
      if (!apiToken) {
        console.error(
          "[API Client] API_TOKEN is not configured in environment variables.",
        );
        return null;
      }

      const response = await fetch(createApiUrl("/auth/token"), {
        headers: { "X-API-Token": apiToken },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        // Always consume the body to prevent stalled response warnings
        const errBody = await response.text();
        console.error("Failed to get JWT token:", errBody);
        return null;
      }

      // FIX: Define the expected shape of the JSON response
      const data: { data: { token: string } } = await response.json();
      jwtToken = data.data.token;

      if (jwtToken) {
        const payload = JSON.parse(atob(jwtToken.split(".")[1]));
        tokenExpiry = payload.exp * 1000; // Convert to milliseconds
      }

      return jwtToken;
    } catch (error) {
      console.error("Error getting JWT token:", error);
      return null;
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * A resilient fetch wrapper that handles authentication, retries, and timeouts.
 * This is the primary function for making API calls.
 * @param url The full URL to fetch.
 * @param options Standard RequestInit options.
 * @param retries Number of retries on failure.
 * @param timeout Request timeout in milliseconds.
 * @param requiresAuth Whether the request requires a JWT token.
 * @returns A promise that resolves to the Response object.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
  timeout = 8000,
  requiresAuth = true,
): Promise<Response> {
  try {
    const headers = new Headers(options.headers || {});
    if (requiresAuth) {
      const token = await getJwtToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        // If auth is required but no token could be obtained, fail early.
        throw new Error("Authentication required but no token available.");
      }
    }

    // If authentication is required, we MUST NOT cache this request at the fetch level
    // to prevent Cloudflare from serving a cached authenticated response to a different user or session.
    if (requiresAuth && !options.cache) {
      options.cache = "no-store";
    }

    // Use Cloudflare Service Bindings if available during SSR for 0ms latency
    const backendApi =
      (import.meta.env as any).BACKEND_API ||
      (typeof process !== "undefined" && process.env ? process.env.BACKEND_API : undefined) ||
      (globalThis as any).env?.BACKEND_API;

    let response: Response;
    if (import.meta.env.SSR && backendApi && url.startsWith(API_BASE_URL)) {
      const request = new Request(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(timeout),
      });
      response = await backendApi.fetch(request);
    } else {
      response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(timeout),
      });
    }

    const newToken = response.headers.get("X-New-Token");
    if (newToken) {
      jwtToken = newToken;
      const payload = JSON.parse(atob(newToken.split(".")[1]));
      tokenExpiry = payload.exp * 1000;
    }

    if (response.status === 401 && requiresAuth && retries > 0) {
      // CRITICAL: Cancel the response body before retrying to prevent
      // stalled HTTP response deadlocks on Cloudflare Workers
      await response.body?.cancel();
      console.warn("Authentication failed, retrying with new token...");
      jwtToken = null;
      tokenExpiry = null;
      return fetchWithRetry(url, options, retries - 1, timeout, requiresAuth);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch to ${url} failed. Retrying... (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, 300 * (3 - retries)));
      return fetchWithRetry(url, options, retries - 1, timeout, requiresAuth);
    }
    console.error(`Fetch failed for ${url} after multiple retries.`, error);
    throw error;
  }
}
