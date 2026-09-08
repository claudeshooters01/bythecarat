import { apiError, handle, notFound, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { readGuestOrderIds } from "@/lib/guest-orders";
import { createRetryIntent, getOrder } from "@/lib/services/orders";

/**
 * A fresh payment intent for an order still awaiting payment — the retry path
 * after a dismissed sheet or a declined card. The order and its stock already
 * exist, so this only opens a new gateway attempt.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const limit = await rateLimit(`pay:${clientIp(req)}`, { limit: 15, windowMs: 10 * 60_000 });
  if (!limit.allowed) {
    return apiError(429, "rate_limited", "Too many attempts. Please try again shortly.");
  }

  const [user, guestOrderIds] = await Promise.all([getSession(), readGuestOrderIds()]);
  const { id } = await ctx.params;

  const order = await getOrder(id, { userId: user?.id, guestOrderIds });
  if (!order) return notFound("Order");

  const intent = await createRetryIntent(id);
  if (!intent) {
    return apiError(409, "not_payable", "This order is no longer awaiting payment.");
  }

  return ok(intent, { status: 201 });
});
