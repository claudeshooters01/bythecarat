import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Uniform API envelope: `{ data }` on success, `{ error: { code, message } }`
 * on failure. Every /api/v1 route goes through these helpers so clients can
 * rely on one shape.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const unauthorized = () =>
  apiError(401, "unauthorized", "You must be signed in to do that.");
export const forbidden = () =>
  apiError(403, "forbidden", "You do not have permission to do that.");
export const notFound = (what = "Resource") =>
  apiError(404, "not_found", `${what} not found.`);
export const conflict = (message: string) => apiError(409, "conflict", message);

/** Wraps a route handler: Zod errors → 400, everything else → logged 500. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return apiError(400, "invalid_input", first?.message ?? "Invalid input.");
      }
      if (err instanceof CheckoutError) {
        return apiError(err.status, err.code, err.message);
      }
      // Postgres unique_violation — a slug or SKU already in use. An expected
      // editing mistake, not a server fault.
      if (isUniqueViolation(err)) {
        return apiError(409, "already_exists", "Something with that slug or SKU already exists.");
      }
      console.error("[api] unhandled error:", err);
      return apiError(500, "internal", "Something went wrong. Please try again.");
    }
  };
}

/**
 * Expected, customer-facing failures from the ordering path — out of stock, a
 * price that moved, an empty bag. Thrown deep in a service, rendered as a
 * clean 4xx by `handle` rather than as a 500.
 */
export class CheckoutError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * Postgres unique_violation (23505). Drizzle wraps driver errors, so the code
 * we want is on the cause chain rather than the thrown object — walking it is
 * the difference between a clean 409 and a mystery 500.
 */
function isUniqueViolation(err: unknown): boolean {
  for (let e = err, depth = 0; e && depth < 5; depth++) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "23505") return true;
    e = typeof e === "object" && e !== null && "cause" in e ? e.cause : null;
  }
  return false;
}
