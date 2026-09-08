import { apiError, handle, notFound, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readGuestOrderIds } from "@/lib/guest-orders";
import { cancelPendingOrder, getOrder } from "@/lib/services/orders";

/**
 * Abandon an unpaid order and hand its stock straight back. Shoppers get this
 * as "Cancel order"; without it a change of mind holds a one-of-a-kind piece
 * until the sweeper runs.
 */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const [user, guestOrderIds] = await Promise.all([getSession(), readGuestOrderIds()]);
  const { id } = await ctx.params;

  const order = await getOrder(id, { userId: user?.id, guestOrderIds });
  if (!order) return notFound("Order");

  const cancelled = await cancelPendingOrder(id);
  if (!cancelled) {
    // Already paid, or already cancelled — either way there is nothing to undo
    // here, and a paid order must never be cancelled behind the till.
    return apiError(
      409,
      "not_cancellable",
      "This order can no longer be cancelled. Please contact us if you need help.",
    );
  }

  return ok({ id, status: "cancelled" });
});
