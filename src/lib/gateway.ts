"use client";

import { api, ApiError } from "@/lib/client";

/**
 * Browser-side gateway handoff, shared by checkout and the "complete payment"
 * path on the order page — so a retry behaves exactly like a first attempt.
 */
export type PaymentIntent = {
  provider: "razorpay" | "mock";
  reference: string;
  amountInr: number;
  publicKey: string | null;
};

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  totalInr: number;
  payment: PaymentIntent;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Takes payment for an order that already exists. Resolves when the shopper
 * has completed the gateway flow; throws ApiError("payment_cancelled") if they
 * dismissed it, so callers can route them somewhere useful rather than
 * stranding them.
 *
 * With a real gateway the webhook is what actually marks the order paid — this
 * only needs to know the sheet closed successfully.
 */
export async function payForOrder(order: PlacedOrder, email: string): Promise<void> {
  if (order.payment.provider === "mock") {
    // No gateway configured: capture immediately so the whole flow is
    // exercisable locally and in CI.
    await api("/api/v1/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: order.payment.reference }),
    });
    return;
  }

  await loadRazorpayScript();
  if (!window.Razorpay) throw new ApiError("gateway", "Could not reach the payment gateway.", 502);

  await new Promise<void>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: order.payment.publicKey,
      amount: order.payment.amountInr,
      currency: "INR",
      order_id: order.payment.reference,
      name: "By The Carat",
      description: `Order ${order.orderNumber}`,
      prefill: { email },
      handler: () => resolve(),
      modal: {
        ondismiss: () =>
          reject(
            new ApiError(
              "payment_cancelled",
              "Payment was cancelled. Your order is saved — you can complete or cancel it from your order page.",
              402,
            ),
          ),
      },
    });
    checkout.open();
  });
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new ApiError("gateway", "Payment gateway failed to load.", 502));
    document.head.appendChild(script);
  });
}
