import { apiError, handle, ok } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { attachCartToUser } from "@/lib/services/cart";
import { createUser } from "@/lib/services/users";
import { signupSchema } from "@/lib/validators";

export const POST = handle(async (req: Request) => {
  const limit = await rateLimit(`signup:${clientIp(req)}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return apiError(429, "rate_limited", "Too many attempts. Please try again later.");
  }

  const input = signupSchema.parse(await req.json());
  const user = await createUser(input);
  if (!user) {
    return apiError(409, "email_taken", "An account with that email already exists.");
  }

  await setSessionCookie(user);
  // Carry the guest bag across the sign-up boundary.
  await attachCartToUser(user.id);
  return ok(user, { status: 201 });
});
