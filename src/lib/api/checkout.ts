// src/lib/api/checkout.ts
// Fetches checkout configuration from the backend (enabled payment gateways).

import { createApiUrl, fetchWithRetry } from "./client";
import { withEdgeCache, CACHE_TTL } from "@/lib/edge-cache";

export interface GatewayConfig {
  id: "stripe" | "sslcommerz" | "cod";
  name: string;
  publishableKey?: string;   // Stripe only
  currencies?: string[];
  sandbox?: boolean;         // SSLCommerz only
}

export interface CheckoutConfig {
  gateways: GatewayConfig[];
  guestCheckoutEnabled?: boolean;
  authVerificationMethod?: "email" | "phone" | "both";
}

const COD_FALLBACK: CheckoutConfig = {
  gateways: [{ id: "cod", name: "Cash on Delivery", currencies: ["bdt"] }],
  guestCheckoutEnabled: true,
  authVerificationMethod: "both",
};

/**
 * Get active payment gateway configuration from backend.
 * Uses the shared edge cache (L1 + L2) so it is properly invalidated
 * when /api/purge-cache bumps the KV version.
 */
export async function getCheckoutConfig(): Promise<CheckoutConfig> {
  const result = await withEdgeCache<CheckoutConfig>(
    "checkout_config",
    async () => {
      try {
        const res = await fetchWithRetry(
          createApiUrl("/checkout/config"),
          {},
          3,
          5000,
          false,
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return (await res.json()) as CheckoutConfig;
      } catch (err) {
        console.error("[checkout] Failed to fetch gateway config:", err);
        return null;
      }
    },
    { ttlSeconds: CACHE_TTL.SHORT },
  );
  return result ?? COD_FALLBACK;
}

/**
 * Check if only COD is active (simple COD-only flow).
 */
export function isCodOnly(config: CheckoutConfig): boolean {
  return config.gateways.length === 1 && config.gateways[0].id === "cod";
}
