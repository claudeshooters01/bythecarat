import { randomUUID, randomBytes } from "node:crypto";

/** Primary keys. UUIDv4 — generated in the app so inserts need no round-trip. */
export const newId = (): string => randomUUID();

/** Opaque, unguessable cart cookie value. */
export const newToken = (): string => randomBytes(24).toString("base64url");

const ORDER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I — read aloud to support

/**
 * Human-facing order number, e.g. BTC-7K4M9Q2X. 32^8 ≈ 1.1e12 values, and the
 * column is uniquely indexed, so a collision surfaces as a retryable insert
 * error rather than as two customers sharing a reference.
 */
export function newOrderNumber(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += ORDER_ALPHABET[b % ORDER_ALPHABET.length];
  return `BTC-${out}`;
}
