import { handle, notFound, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { deleteAddress } from "@/lib/services/addresses";

export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const user = await getSession();
    if (!user) return unauthorized();

    const { id } = await ctx.params;
    const removed = await deleteAddress(user.id, id);
    if (!removed) return notFound("Address");
    return ok({ id, deleted: true });
  },
);
