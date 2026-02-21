// src/lib/api/customer-auth.ts
// API client for storefront customer authentication (email OTP).

import { createApiUrl } from "./client";

const BASE = "/customer-auth";

export interface CustomerInfo {
  email: string;
  name: string;
  phone?: string;
  customerId?: string;
}

export interface AuthState {
  authenticated: boolean;
  customer?: CustomerInfo;
}

/**
 * Send OTP to customer email.
 */
export async function sendCustomerOtp(email: string, name?: string): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/send-otp`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, name }),
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
  email: string,
  code: string,
  name?: string,
  phone?: string,
): Promise<{ success: boolean; customer?: CustomerInfo; error?: string; attemptsLeft?: number }> {
  try {
    const res = await fetch(createApiUrl(`${BASE}/verify-otp`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, code, name, phone }),
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
