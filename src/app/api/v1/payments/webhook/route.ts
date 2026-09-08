import { apiError, handle, ok } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/payments";
import { confirmPayment, failPayment, refundPayment } from "@/lib/services/orders";

/**
 * Razorpay webhook — the authority on what happened to a payment.
 *
 * The raw body is read as text and verified before it is parsed: the HMAC is
 * over the exact bytes sent, so re-serialising parsed JSON would break the
 * check. Unknown events return 200 so the provider stops retrying them.
 */
type WebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { order_id?: string } };
  };
};

export const POST = handle(async (req: Request) => {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return apiError(401, "bad_signature", "Invalid webhook signature.");
  }

  const event = JSON.parse(raw) as WebhookEvent;
  const providerRef = event.payload?.payment?.entity?.order_id;

  if (!providerRef) return ok({ ignored: event.event ?? "unknown" });

  const input = { providerRef, provider: "razorpay", raw: event as Record<string, unknown> };

  // Every branch is idempotent, because Razorpay redelivers and because the
  // browser may be racing us on the success path.
  switch (event.event) {
    case "payment.captured": {
      const result = await confirmPayment(input);
      // 200 even when unknown: the payment is not ours, and retrying will not
      // change that.
      return ok(result ?? { ignored: "unknown_reference" });
    }
    case "payment.failed": {
      // Releases the order's stock rather than letting a declined card hold a
      // one-of-a-kind piece until the sweeper catches it.
      const result = await failPayment(input);
      return ok(result ?? { ignored: "unknown_reference" });
    }
    case "refund.processed": {
      const result = await refundPayment(input);
      return ok(result ?? { ignored: "unknown_reference" });
    }
    default:
      return ok({ ignored: event.event ?? "unknown" });
  }
});
