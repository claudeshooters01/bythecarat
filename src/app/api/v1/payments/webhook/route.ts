import { apiError, handle, ok } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/payments";
import { confirmPayment } from "@/lib/services/orders";

/**
 * Razorpay webhook — the authority on whether an order is paid.
 *
 * The raw body is read as text and verified before it is parsed: HMAC is over
 * the exact bytes sent, so re-serialising parsed JSON would break the check.
 * Unknown events return 200 so the provider stops retrying them.
 */
export const POST = handle(async (req: Request) => {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return apiError(401, "bad_signature", "Invalid webhook signature.");
  }

  const event = JSON.parse(raw) as {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string } } };
  };

  if (event.event !== "payment.captured") return ok({ ignored: event.event ?? "unknown" });

  const providerRef = event.payload?.payment?.entity?.order_id;
  if (!providerRef) return apiError(400, "invalid_payload", "Missing order reference.");

  // Idempotent: a redelivered webhook resolves to alreadyCaptured.
  const result = await confirmPayment({
    providerRef,
    provider: "razorpay",
    raw: event as Record<string, unknown>,
  });

  if (!result) {
    // 200, not 404: the payment is not ours to capture and retrying will not
    // change that.
    return ok({ ignored: "unknown_reference" });
  }
  return ok(result);
});
