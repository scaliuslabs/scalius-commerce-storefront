// src/lib/api/orders.ts

import { createApiUrl, fetchWithRetry } from "./client";
import type { Order, CreateOrderPayload, ApiResponse } from "./types";

/**
 * Submits a new order to the backend.
 * This is an authenticated request.
 *
 * @param payload The data for the new order, including customer info and items.
 * @returns A promise resolving to an object with the new order's ID or an error.
 */
export async function createOrder(
  payload: CreateOrderPayload,
): Promise<{ success: boolean; orderId?: string; error?: any }> {
  try {
    const url = createApiUrl("/orders");
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      2,
      15000, // Longer timeout for order creation
      true, // Requires authentication
    );

    const data: ApiResponse<{ id: string }> = await response.json();

    if (!response.ok || !data.success) {
      console.error(
        "Failed to create order:",
        data.error || response.statusText,
      );
      return { success: false, error: data.error };
    }

    return { success: true, orderId: data.data.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

/**
 * Fetches the details of a specific order by its ID.
 * This is an authenticated request.
 *
 * @param orderId The unique identifier of the order.
 * @returns A promise resolving to the full Order object or null if not found.
 */
export async function getOrderDetails(orderId: string): Promise<Order | null> {
  if (!orderId) {
    console.error("getOrderDetails: orderId is required.");
    return null;
  }

  try {
    const url = createApiUrl(`/orders/${orderId}`);
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status}`);
    }

    const data: { order: Order } = await response.json();
    return data.order;
  } catch (error) {
    console.error(`Error fetching details for order "${orderId}":`, error);
    return null;
  }
}
