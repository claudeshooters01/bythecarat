import { handle, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { removeFromWishlist } from "@/lib/services/wishlist";

export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ productId: string }> }) => {
    const user = await getSession();
    if (!user) return unauthorized();

    const { productId } = await ctx.params;
    await removeFromWishlist(user.id, productId);
    return ok({ productId, saved: false });
  },
);
