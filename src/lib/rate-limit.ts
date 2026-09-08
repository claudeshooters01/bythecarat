/**
 * Fixed-window rate limiter.
 *
 * With UPSTASH_REDIS_REST_URL/TOKEN set (production), windows live in Redis —
 * one INCR + EXPIRE NX per check — so every serverless instance shares the
 * same counters. Without them (development, or Redis outage) it falls back to
 * an in-memory Map, which limits per-instance: weaker, but fail-open beats
 * locking every shopper out because Redis blinked.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

function memoryRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const win = windows.get(key);

  if (!win || win.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  win.count += 1;
  if (win.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((win.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

async function redisRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<{ allowed: boolean; retryAfterSeconds: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSeconds = Math.ceil(windowMs / 1000);
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["EXPIRE", `rl:${key}`, `${windowSeconds}`, "NX"],
        ["TTL", `rl:${key}`],
      ]),
      // A slow limiter must not stall checkout; give Redis one second.
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ result: number }>;
    const count = results[0]?.result;
    const ttl = results[2]?.result;
    if (typeof count !== "number") return null;

    if (count > limit) {
      return { allowed: false, retryAfterSeconds: ttl && ttl > 0 ? ttl : windowSeconds };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return null; // fall through to the in-memory limiter
  }
}

export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const fromRedis = await redisRateLimit(key, opts);
  return fromRedis ?? memoryRateLimit(key, opts);
}

// Bound memory: sweep expired windows occasionally.
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of windows) {
    if (win.resetAt <= now) windows.delete(key);
  }
}, 60_000).unref?.();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}
