// src/pages/api/checkout/create-order.ts
// Server-side proxy: creates an order in the backend using the service API token.
// The API_TOKEN is only available server-side, never exposed to the browser.

import type { APIRoute } from "astro";
import { fetchWithRetry, createApiUrl } from "@/lib/api/client";

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();

    const res = await fetchWithRetry(createApiUrl("/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      return new Response(JSON.stringify({ error: (data.error as string) || (data.message as string) || "Order creation failed" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[checkout/create-order] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
