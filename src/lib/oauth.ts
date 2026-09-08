import { createRemoteJWKSet, jwtVerify } from "jose";
import { siteUrl } from "@/lib/site";

/**
 * Google Sign-In, authorization-code flow.
 *
 * The whole feature is optional: with no client credentials configured,
 * `googleEnabled()` is false and the button never renders, so the app runs
 * unchanged locally and in CI.
 */
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// Google's public signing keys, fetched and cached by jose.
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function credentials(): { id: string; secret: string } {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Google sign-in is not configured");
  return { id, secret };
}

/** Must match a redirect URI registered in the Google Cloud console exactly. */
export function redirectUri(): string {
  return `${siteUrl}/api/v1/auth/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const { id } = credentials();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // We only need identity, so there is no refresh token to ask for.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export type GoogleProfile = { googleId: string; email: string; name: string };

/**
 * Exchange the authorization code and validate the returned id_token.
 *
 * The token is verified against Google's published keys, with issuer and
 * audience pinned — a token minted for a different app must not be accepted
 * here. `email_verified` is required: without it, anyone could register a
 * Google profile using someone else's address and be linked to their account.
 */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const { id, secret } = credentials();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google did not return an id_token");

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: id,
  });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  const sub = payload.sub;

  if (!sub || !email) throw new Error("Google profile is missing an id or email");
  if (payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }

  return {
    googleId: sub,
    email,
    // Some Google accounts have no name set; the email local part is a decent
    // stand-in, and the customer can never end up with a blank display name.
    name: (typeof payload.name === "string" && payload.name.trim()) || email.split("@")[0],
  };
}
