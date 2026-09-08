import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { exchangeCodeForProfile, googleEnabled } from "@/lib/oauth";
import { attachCartToUser } from "@/lib/services/cart";
import { findOrCreateGoogleUser } from "@/lib/services/users";
import { OAUTH_STATE_COOKIE } from "../route";

/**
 * Google redirects here. Everything is validated before a session is issued:
 * the state must match the cookie we set, the code must exchange, and the
 * id_token must verify against Google's keys with a verified email.
 *
 * Failures redirect to /login with a code rather than rendering an error —
 * this is a page navigation, not an API call, and the shopper needs somewhere
 * to go.
 */
function fail(req: Request, reason: string) {
  return NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
}

export async function GET(req: Request) {
  if (!googleEnabled()) return fail(req, "google_unavailable");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // The shopper pressed cancel on Google's consent screen.
  if (url.searchParams.get("error")) return fail(req, "google_cancelled");
  if (!code || !state) return fail(req, "google_failed");

  const store = await cookies();
  const parked = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE); // single use, whatever happens next

  if (!parked) return fail(req, "google_expired");

  const separator = parked.indexOf(":");
  const expectedState = parked.slice(0, separator);
  const next = parked.slice(separator + 1) || "/account";

  if (!expectedState || expectedState !== state) return fail(req, "google_state");

  try {
    const profile = await exchangeCodeForProfile(code);
    const user = await findOrCreateGoogleUser(profile);

    await setSessionCookie(user);
    // Carry the guest bag across the sign-in boundary, exactly as password
    // login does.
    await attachCartToUser(user.id);

    return NextResponse.redirect(new URL(next, req.url));
  } catch (err) {
    console.error("[auth] Google sign-in failed:", err);
    return fail(req, "google_failed");
  }
}
