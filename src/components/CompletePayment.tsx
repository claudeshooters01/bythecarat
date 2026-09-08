"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { payForOrder, type PlacedOrder } from "@/lib/gateway";
import { formatInr } from "@/lib/money";

/**
 * Rescue path for an order that exists but was never paid — a dismissed
 * sheet, a declined card, a closed tab. Either finish paying, or cancel and
 * put the piece back on sale for someone else.
 */
export function CompletePayment({
  orderId,
  email,
  totalInr,
}: {
  orderId: string;
  email: string;
  totalInr: number;
}) {
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      const order = await api<PlacedOrder>(`/api/v1/orders/${orderId}/pay`, { method: "POST" });
      await payForOrder(order, email);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment could not be started.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    try {
      await api(`/api/v1/orders/${orderId}/cancel`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this order.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-card p-6">
      <h2 className="font-display text-2xl text-ink-900">This order is not paid yet</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        We are holding these pieces for you. If you do not complete payment, the hold is released
        automatically after about 30 minutes and they go back on sale.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={pay}
          disabled={busy !== null}
          className="rounded-full bg-royal-600 px-7 py-3 text-sm font-semibold text-on-accent hover:bg-royal-700 disabled:opacity-50"
        >
          {busy === "pay" ? "Opening…" : `Complete payment — ${formatInr(totalInr)}`}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy !== null}
          className="text-sm text-ink-600 underline underline-offset-2 hover:text-danger disabled:opacity-50"
        >
          {busy === "cancel" ? "Cancelling…" : "Cancel this order"}
        </button>
      </div>
    </div>
  );
}
