// src/lib/api/customer-auth.ts
// API client for storefront customer authentication (email OTP).

import { createApiUrl } from "./client";

const BASE = "/customer-auth";

export interface CustomerInfo {
  email: string;
  name: string;
  phone?: string;
  customerId?: string;
  address?: string | null;
  city?: string | null;
  cityName?: string | null;
  zone?: string | null;
  zoneName?: string | null;
}

export interface AuthState {
  authenticated: boolean;
  customer?: CustomerInfo;
}

/**
 * Send OTP to customer via email or phone.
 */
export async function sendCustomerOtp(
  method: "email" | "phone",
  identifier: string,
  name?: string
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/send-otp`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ method, identifier, name }),
    });
    const data = await res.json() as any;
    if (!res.ok) return { success: false, error: data.error, retryAfter: data.retryAfter };
    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

/**
 * Verify OTP and create session.
 */
export async function verifyCustomerOtp(
  method: "email" | "phone",
  identifier: string,
  code: string,
  name?: string,
): Promise<{ success: boolean; customer?: CustomerInfo; error?: string; attemptsLeft?: number }> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/verify-otp`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ method, identifier, code, name }),
    });
    const data = await res.json() as any;
    if (!res.ok) return { success: false, error: data.error, attemptsLeft: data.attemptsLeft };
    return { success: true, customer: data.customer };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

/**
 * Get current customer session info.
 */
export async function getCustomerSession(): Promise<AuthState> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/me`), {
      credentials: "include",
    });
    if (!res.ok) return { authenticated: false };
    return await res.json() as AuthState;
  } catch {
    return { authenticated: false };
  }
}

/**
 * Log out the current customer.
 */
export async function logoutCustomer(): Promise<void> {
  try {
    await fetch(createApiUrl(`${BASE}/logout`), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore errors
  }
}

export interface CustomerOrderItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  productName: string | null;
  productSlug: string | null;
  productImage: string | null;
  variantSize: string | null;
  variantColor: string | null;
}

export interface CustomerOrder {
  id: string;
  status: string;
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number | null;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentStatus: string;
  shippingAddress: string;
  cityName: string | null;
  zoneName: string | null;
  areaName: string | null;
  notes: string | null;
  createdAt: string | null;
  items: CustomerOrderItem[];
}

export interface ProfileUpdateData {
  name?: string;
  address?: string;
  cityName?: string;
  zoneName?: string;
}

/**
 * Update customer profile. Requires active session (cs_tok cookie).
 */
export async function updateCustomerProfile(data: ProfileUpdateData): Promise<{
  success: boolean;
  customer?: CustomerInfo;
  error?: string;
}> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/profile`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const result = await res.json() as any;
    if (!res.ok) {
      return { success: false, error: result.error };
    }
    return { success: true, customer: result.customer };
  } catch {
    return { success: false, error: "Network error" };
  }
}

/**
 * Get customer order history. Requires active session (cs_tok cookie).
 */
export async function getCustomerOrders(): Promise<{
  success: boolean;
  orders: CustomerOrder[];
  customer?: CustomerInfo;
  error?: string;
}> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/orders`), {
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json() as any;
      return { success: false, orders: [], error: data.error };
    }
    const data = await res.json() as any;
    return { success: true, orders: data.orders || [], customer: data.customer };
  } catch {
    return { success: false, orders: [], error: "Network error" };
  }
}
