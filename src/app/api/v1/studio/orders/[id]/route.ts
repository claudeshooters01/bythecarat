import { forbidden, handle, notFound, ok, unauthorized } from "@/lib/api";
import { canManage, getSession } from "@/lib/auth";
import { setOrderStatus } from "@/lib/services/orders";
import { orderStatusSchema } from "@/lib/validators";

/** Fulfilment: paid → shipped → delivered, or cancelled/refunded. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const { id } = await ctx.params;
  const { status } = orderStatusSchema.parse(await req.json());
  const row = await setOrderStatus(id, status);
  if (!row) return notFound("Order");
  return ok(row);
});
