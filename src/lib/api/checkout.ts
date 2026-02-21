// src/lib/api/checkout.ts
// Fetches checkout configuration from the backend (enabled payment gateways).

import { createApiUrl } from "./client";

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

let cachedConfig: CheckoutConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get active payment gateway configuration from backend.
 * Cached in memory for 5 minutes.
 */
export async function getCheckoutConfig(): Promise<CheckoutConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) return cachedConfig;

  try {
    const res = await fetch(createApiUrl("/checkout/config"), {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    cachedConfig = await res.json() as CheckoutConfig;
    cachedAt = now;
    return cachedConfig;
  } catch (err) {
    console.error("[checkout] Failed to fetch gateway config:", err);
    // Fallback: COD only, safe defaults
    return {
      gateways: [{ id: "cod", name: "Cash on Delivery", currencies: ["bdt"] }],
      guestCheckoutEnabled: true,
      authVerificationMethod: "both"
    };
  }
}

/**
 * Check if only COD is active (simple COD-only flow).
 */
export function isCodOnly(config: CheckoutConfig): boolean {
  return config.gateways.length === 1 && config.gateways[0].id === "cod";
}
