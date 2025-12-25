// src/pages/api/purge-cache.ts
import type { APIRoute } from "astro";
import { smartCache } from "@/lib/smart-cache";

const CACHE_VERSION_KEY_PREFIX = "v_";

export const prerender = false;

/**
 * Warm critical caches after purge.
 * This ensures the next visitor gets fast response by pre-populating
 * the L2 edge cache with essential data (layout, homepage).
 *
 * @param baseUrl The base URL of the site (e.g., https://grameenjute.com)
 */
async function warmCriticalCaches(baseUrl: string): Promise<void> {
  // These endpoints are called on EVERY page load, so warming them
  // provides the biggest performance benefit
  const criticalEndpoints = [
    "/", // Homepage - triggers getLayoutData() + getHomepageData()
  ];

  console.log(`[CacheWarm] Starting warm for ${baseUrl} in 5 seconds...`);

  // Wait 5 seconds before warming to let the purge fully propagate
  // and avoid race conditions with simultaneous requests
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const results = await Promise.allSettled(
    criticalEndpoints.map(async (endpoint) => {
      const start = Date.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            // Identify this as a cache warm request in logs
            "X-Cache-Warm": "true",
            // Ensure we get a fresh response that gets cached
            "Cache-Control": "no-cache",
          },
        });

        const duration = Date.now() - start;
        if (response.ok) {
          console.log(
            `[CacheWarm] ${endpoint} warmed successfully in ${duration}ms`,
          );
        } else {
          console.warn(
            `[CacheWarm] ${endpoint} returned ${response.status} in ${duration}ms`,
          );
        }
        return response.ok;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(
          `[CacheWarm] ${endpoint} failed after ${duration}ms:`,
          error,
        );
        throw error;
      }
    }),
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  console.log(
    `[CacheWarm] Completed: ${successful}/${criticalEndpoints.length} endpoints warmed`,
  );
}

export const GET: APIRoute = async ({ url, locals }) => {
  const providedToken = url.searchParams.get("token");

  const hostname = url.hostname;
  const cacheKey = `${CACHE_VERSION_KEY_PREFIX}${hostname}`;

  const secretToken = import.meta.env.PURGE_TOKEN;
  const kv = locals.runtime.env.CACHE_CONTROL;

  if (!secretToken) {
    console.error("PURGE_TOKEN is not set in environment variables.");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!providedToken || providedToken !== secretToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const currentVersionStr = await kv.get(cacheKey);
    const currentVersion = currentVersionStr
      ? parseInt(currentVersionStr, 10)
      : 0;
    const newVersion = currentVersion + 1;

    await kv.put(cacheKey, newVersion.toString());

    // Clear the in-memory API cache as well
    // This ensures cached API data (widgets, collections, products, etc.) is also refreshed
    smartCache.clear();

    // Warm critical caches in the background
    // This ensures the next visitor gets fast response
    // Uses waitUntil to avoid blocking the purge response
    const protocol = url.protocol; // 'https:' or 'http:'
    const baseUrl = `${protocol}//${hostname}`;
    locals.runtime.ctx.waitUntil(warmCriticalCaches(baseUrl));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cache for ${hostname} invalidated. New version is ${newVersion}.`,
        details: {
          htmlCachePurged: true,
          apiCachePurged: true,
          l2CacheInvalidated: true,
          cacheWarmingStarted: true,
          newVersion,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      `Failed to update cache version in KV for ${hostname}:`,
      error,
    );
    return new Response(JSON.stringify({ error: "Failed to purge cache" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
