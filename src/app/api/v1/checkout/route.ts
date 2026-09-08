import { apiError, handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { readCart } from "@/lib/services/cart";
import { checkout } from "@/lib/services/orders";
import { checkoutSchema } from "@/lib/validators";

/**
 * Place the order and open a payment intent. The response carries everything
 * the browser needs to launch the gateway widget; nothing is marked paid here.
 */
export const POST = handle(async (req: Request) => {
  const limit = await rateLimit(`checkout:${clientIp(req)}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!limit.allowed) {
    return apiError(429, "rate_limited", "Too many checkout attempts. Please try again shortly.");
  }

  const user = await getSession();
  const input = checkoutSchema.parse(await req.json());

  // Never trust a cart id from the client — resolve it from the session or
  // the signed cookie, exactly as the bag page does.
  const cart = await readCart(user?.id ?? null);
  if (!cart.cartId || cart.lines.length === 0) {
    return apiError(400, "empty_bag", "Your bag is empty.");
  }

  const order = await checkout({
    cartId: cart.cartId,
    userId: user?.id ?? null,
    email: input.email,
    shippingAddress: input.shippingAddress,
  });

  return ok(order, { status: 201 });
});
