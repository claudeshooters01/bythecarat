import { handle, notFound, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readGuestOrderIds } from "@/lib/guest-orders";
import { getOrder } from "@/lib/services/orders";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const [user, guestOrderIds] = await Promise.all([getSession(), readGuestOrderIds()]);
  const { id } = await ctx.params;

  // Scoped to the caller: the signed-in owner, or the guest browser that
  // placed it. An order id on its own reveals nothing.
  const order = await getOrder(id, { userId: user?.id, guestOrderIds });
  if (!order) return notFound("Order");
  return ok(order);
});
