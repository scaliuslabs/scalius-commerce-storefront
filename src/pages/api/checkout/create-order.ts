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
      // Backend returns errors as { error: { code, message } } or { error: string }
      const errorMsg = typeof data.error === 'string'
        ? data.error
        : (data.error as any)?.message || (data.details as string) || (data.message as string) || "Order creation failed";
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Capture the 202 Async Accepted queue payload and poll for D1 Database completion!
    if (res.status === 202 && data.success && (data.data as any)?.checkoutToken) {
      const checkoutToken = (data.data as any).checkoutToken;
      const initialOrderId = (data.data as any).orderId;

      let attempts = 0;
      const maxAttempts = 30; // 30 * 1.5s = 45s max wait time

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const statusRes = await fetchWithRetry(createApiUrl(`/orders/status/${checkoutToken}`), {}, 2, 5000, true);

        if (statusRes.ok) {
          const statusData = await statusRes.json() as Record<string, any>;
          if (statusData.status === "completed") {
            return new Response(JSON.stringify({
              success: true,
              data: { id: statusData.orderId || initialOrderId }
            }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } else if (statusData.status === "failed") {
            return new Response(JSON.stringify({
              success: false,
              error: statusData.error || "Order ingestion failed during high traffic. Please try again."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        attempts++;
      }

      return new Response(JSON.stringify({ success: false, error: "Order processing timed out. Please check your order history." }), {
        status: 408,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normal synchronous return (e.g. if the backend rolls back to synchronous in the future)
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
