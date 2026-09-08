import { apiError, handle, ok } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { attachCartToUser } from "@/lib/services/cart";
import { authenticate } from "@/lib/services/users";
import { loginSchema } from "@/lib/validators";

export const POST = handle(async (req: Request) => {
  const limit = await rateLimit(`login:${clientIp(req)}`, { limit: 10, windowMs: 15 * 60_000 });
  if (!limit.allowed) {
    return apiError(429, "rate_limited", "Too many attempts. Please try again later.");
  }

  const input = loginSchema.parse(await req.json());
  const user = await authenticate(input.email, input.password);
  // One message for both "no such account" and "wrong password" — never
  // confirm which emails are registered.
  if (!user) return apiError(401, "invalid_credentials", "Incorrect email or password.");

  await setSessionCookie(user);
  await attachCartToUser(user.id);
  return ok(user);
});
