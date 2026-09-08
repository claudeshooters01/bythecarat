import { cookies } from "next/headers";

/**
 * Guests can check out — that is deliberate — which leaves them holding an
 * order they have no account to look it up from. This records the orders a
 * browser has placed in an httpOnly cookie, so the order page can let them
 * back in to pay, cancel or simply read it, without turning the order id
 * itself into a bearer token that anyone could guess.
 *
 * Signed-in shoppers do not need this; their orders are found by user id.
 */
const GUEST_ORDERS_COOKIE = "btc_orders";
const TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days
const MAX_TRACKED = 20;

export async function readGuestOrderIds(): Promise<string[]> {
  const raw = (await cookies()).get(GUEST_ORDERS_COOKIE)?.value;
  if (!raw) return [];
  // Opaque, comma-separated ids. Anything malformed is simply not matched.
  return raw.split(",").filter(Boolean).slice(0, MAX_TRACKED);
}

export async function rememberGuestOrder(orderId: string): Promise<void> {
  const store = await cookies();
  const existing = (store.get(GUEST_ORDERS_COOKIE)?.value ?? "").split(",").filter(Boolean);
  // Newest first, de-duplicated, bounded so the cookie cannot grow forever.
  const next = [orderId, ...existing.filter((id) => id !== orderId)].slice(0, MAX_TRACKED);

  store.set(GUEST_ORDERS_COOKIE, next.join(","), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export { GUEST_ORDERS_COOKIE };
