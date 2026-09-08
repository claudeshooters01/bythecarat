import { handle, notFound, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readCart, updateCartItem } from "@/lib/services/cart";
import { updateCartItemSchema } from "@/lib/validators";

/** Change quantity. qty 0 removes the line, so the bag needs one verb, not two. */
export const PATCH = handle(
  async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
    const user = await getSession();
    const { itemId } = await ctx.params;
    const { qty } = updateCartItemSchema.parse(await req.json());

    // Scoped to the caller's own cart, so an item id from another shopper's
    // bag matches nothing.
    const cart = await readCart(user?.id ?? null);
    if (!cart.cartId) return notFound("Bag");

    return ok(await updateCartItem(cart.cartId, itemId, qty));
  },
);

export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
    const user = await getSession();
    const { itemId } = await ctx.params;

    const cart = await readCart(user?.id ?? null);
    if (!cart.cartId) return notFound("Bag");

    return ok(await updateCartItem(cart.cartId, itemId, 0));
  },
);
