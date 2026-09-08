import { handle, notFound, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getOrder } from "@/lib/services/orders";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await getSession();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  // Scoped to the caller: an order id alone never reveals someone else's purchase.
  const order = await getOrder(id, user.id);
  if (!order) return notFound("Order");
  return ok(order);
});
