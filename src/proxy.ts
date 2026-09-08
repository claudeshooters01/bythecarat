import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Edge proxy (Next 16's rename of middleware): coarse route protection before
 * any server work runs. API routes do their own fine-grained checks; this
 * guards the pages.
 *
 * Deliberately NOT matched: /cart and /checkout. Guests must be able to fill
 * a bag and reach the checkout form — forcing a login at the bag is the
 * single most expensive thing a jewellery store can do to its conversion rate.
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  const { pathname } = req.nextUrl;

  if (!user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/studio") && user.role !== "staff" && user.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/studio/:path*"],
};
