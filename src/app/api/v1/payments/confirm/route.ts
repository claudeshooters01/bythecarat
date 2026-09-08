import { z } from "zod";
import { apiError, handle, notFound, ok } from "@/lib/api";
import { activeProvider } from "@/lib/payments";
import { confirmPayment } from "@/lib/services/orders";

const confirmSchema = z.object({
  reference: z.string().trim().min(6).max(120),
});

/**
 * Browser-side confirmation after the gateway widget returns.
 *
 * This is a convenience so the shopper sees a paid order immediately — the
 * webhook is the authority and will confirm the same payment independently.
 * Both paths funnel through confirmPayment, which is idempotent, so whichever
 * arrives second is a no-op.
 */
export const POST = handle(async (req: Request) => {
  const { reference } = confirmSchema.parse(await req.json());
  const provider = activeProvider();

  // With a real gateway configured, only a signed webhook may capture. A
  // client POST is not proof of payment.
  if (provider !== "mock") {
    return apiError(
      409,
      "awaiting_webhook",
      "Payment is being confirmed with your bank. This page will update shortly.",
    );
  }

  const result = await confirmPayment({ providerRef: reference, provider: "mock" });
  if (!result) return notFound("Payment");
  return ok(result);
});
