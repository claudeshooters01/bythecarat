import { apiError, handle, ok } from "@/lib/api";
import { releaseAbandonedOrders } from "@/lib/services/orders";

/**
 * Scheduled sweep (see vercel.json). Cancels orders left unpaid past the
 * window and returns their stock to the catalogue.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set.
 * This route refuses to run unauthenticated in production — an open endpoint
 * that cancels orders is not something to leave lying around.
 */
// How long an unpaid order may hold its stock. Tunable because the right
// number is a merchandising decision, not a code one: a store selling
// one-of-a-kind pieces wants a shorter hold than one selling from deep stock.
const WINDOW_MINUTES = Number(process.env.ORDER_HOLD_MINUTES ?? 30);

export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return apiError(401, "unauthorized", "Invalid cron credentials.");
    }
  } else if (process.env.NODE_ENV === "production") {
    return apiError(500, "not_configured", "CRON_SECRET must be set in production.");
  }

  const result = await releaseAbandonedOrders(WINDOW_MINUTES);
  if (result.released > 0) {
    console.log(`[cron] released ${result.released} abandoned order(s)`);
  }
  return ok({ ...result, windowMinutes: WINDOW_MINUTES });
});
