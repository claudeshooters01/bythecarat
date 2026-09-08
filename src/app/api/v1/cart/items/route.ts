import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addToCart, getOrCreateCart } from "@/lib/services/cart";
import { addToCartSchema } from "@/lib/validators";

/**
 * Add to bag. Works for guests: getOrCreateCart mints a cart row and sets the
 * cookie, so nothing forces a sign-in before the shopper is ready.
 */
export const POST = handle(async (req: Request) => {
  const user = await getSession();
  const input = addToCartSchema.parse(await req.json());
  const cartId = await getOrCreateCart(user?.id ?? null);
  return ok(await addToCart(cartId, input), { status: 201 });
});
