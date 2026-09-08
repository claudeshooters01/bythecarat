import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthUrl, googleEnabled } from "@/lib/oauth";

/**
 * Starts the Google flow. Mints a one-time `state` value, parks it in a
 * short-lived httpOnly cookie alongside where the shopper was headed, and
 * redirects to Google. The callback refuses anything whose state does not
 * match, which is what stops a forged callback signing someone in.
 */
export const OAUTH_STATE_COOKIE = "btc_oauth";

export async function GET(req: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
  }

  const requested = new URL(req.url).searchParams.get("next") ?? "/account";
  // Only ever an in-app path, so a crafted ?next= cannot bounce the shopper to
  // another origin after signing in.
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/account";

  const state = randomBytes(16).toString("base64url");

  (await cookies()).set(OAUTH_STATE_COOKIE, `${state}:${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // 'lax' still sends the cookie on Google's top-level redirect back to us.
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
