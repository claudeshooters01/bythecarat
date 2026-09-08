import crypto from "node:crypto";
import { brand } from "@/lib/brand";

/**
 * Payment provider seam.
 *
 * Checkout never talks to a gateway directly — it asks for an "intent" and
 * later verifies a callback. Razorpay is the real implementation (UPI, cards,
 * netbanking, India); `mock` stands in wherever keys are absent, so the whole
 * order flow is runnable locally and in CI without a merchant account.
 * Adding Stripe for international orders means adding one more branch here.
 */

export type PaymentIntent = {
  provider: "razorpay" | "mock";
  /** Provider-side order/session id. Persisted as payments.provider_ref. */
  reference: string;
  amountInr: number;
  /** Publishable key for the browser checkout widget; null for mock. */
  publicKey: string | null;
};

function razorpayKeys(): { id: string; secret: string } | null {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return id && secret ? { id, secret } : null;
}

export function activeProvider(): "razorpay" | "mock" {
  return razorpayKeys() ? "razorpay" : "mock";
}

export async function createPaymentIntent(opts: {
  orderNumber: string;
  amountInr: number;
}): Promise<PaymentIntent> {
  const keys = razorpayKeys();

  if (!keys) {
    // Development stand-in. The reference is unguessable so the confirm step
    // is still a real check rather than a formality.
    return {
      provider: "mock",
      reference: `mock_${crypto.randomBytes(12).toString("hex")}`,
      amountInr: opts.amountInr,
      publicKey: null,
    };
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keys.id}:${keys.secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Razorpay also counts in paise, so the amount passes through unscaled.
      amount: opts.amountInr,
      currency: "INR",
      receipt: opts.orderNumber,
      notes: { store: brand.name },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
  }

  const order = (await res.json()) as { id: string; amount: number };
  return {
    provider: "razorpay",
    reference: order.id,
    amountInr: order.amount,
    publicKey: keys.id,
  };
}

/**
 * Verifies a Razorpay webhook body against the shared webhook secret.
 * Timing-safe: a byte-by-byte early return would leak the signature.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
