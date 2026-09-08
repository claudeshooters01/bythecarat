"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { payForOrder, type PlacedOrder } from "@/lib/gateway";
import { formatInr } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/states";
import type { CartSummary } from "@/lib/services/cart";

/**
 * Checkout is deliberately one page: address, then pay. Every extra step
 * between a filled bag and a captured payment costs orders.
 *
 * The order row is written before the gateway opens, so an abandoned payment
 * leaves a recoverable `pending_payment` order rather than nothing at all.
 */
export function CheckoutForm({
  cart,
  defaultEmail,
}: {
  cart: CartSummary;
  defaultEmail: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      shippingAddress: {
        fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        line1: String(form.get("line1") ?? ""),
        line2: String(form.get("line2") ?? ""),
        city: String(form.get("city") ?? ""),
        state: String(form.get("state") ?? ""),
        pincode: String(form.get("pincode") ?? ""),
      },
    };

    try {
      const order = await api<PlacedOrder>("/api/v1/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      try {
        await payForOrder(order, payload.email);
      } catch (paymentError) {
        // The order exists and holds stock, but the bag is already converted —
        // leaving them on an empty checkout page would strand them. Send them
        // to the order, where they can complete payment or cancel and free
        // the piece for someone else.
        router.push(`/orders/${order.id}?payment=failed`);
        router.refresh();
        throw paymentError;
      }

      router.push(`/orders/${order.id}?placed=1`);
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err.message : "Checkout failed. Please try again.");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-8">
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl text-ink-900">Contact</h2>
          <Field label="Email" name="email" type="email" defaultValue={defaultEmail} required />
          <p className="mt-2 text-xs text-ink-400">
            Your order confirmation and certificate documents go here.
          </p>
        </section>

        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl text-ink-900">Shipping address</h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Full name" name="fullName" required />
            <Field label="Mobile number" name="phone" type="tel" inputMode="numeric" required />
            <div className="sm:col-span-2">
              <Field label="Address" name="line1" required />
            </div>
            <div className="sm:col-span-2">
              <Field label="Apartment, landmark (optional)" name="line2" />
            </div>
            <Field label="City" name="city" required />
            <label className="block">
              <span className="mt-4 block text-sm font-medium text-ink-900">State</span>
              <select
                name="state"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink-900 focus:border-royal-500 focus:outline-none"
              >
                <option value="" disabled>
                  Select a state
                </option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <Field label="PIN code" name="pincode" inputMode="numeric" required />
          </div>
        </section>
      </div>

      <aside className="rounded-xl border border-line bg-card p-6 lg:sticky lg:top-40">
        <h2 className="font-display text-2xl text-ink-900">Your order</h2>

        <ul className="mt-4 space-y-3 text-sm">
          {cart.lines.map((line) => (
            <li key={line.itemId} className="flex justify-between gap-3">
              <span className="min-w-0 text-ink-600">
                <span className="line-clamp-1 text-ink-900">{line.title}</span>
                {line.variantLabel && <span className="text-xs">{line.variantLabel} · </span>}
                <span className="text-xs">Qty {line.qty}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatInr(line.lineTotalInr)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-600">Subtotal</dt>
            <dd className="tabular-nums">{formatInr(cart.subtotalInr)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Insured shipping</dt>
            <dd className="tabular-nums">
              {cart.shippingInr === 0 ? "Complimentary" : formatInr(cart.shippingInr)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">GST</dt>
            <dd className="tabular-nums">{formatInr(cart.taxInr)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatInr(cart.totalInr)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || cart.lines.length === 0}
          className="mt-6 w-full rounded-full bg-royal-600 px-6 py-3.5 text-sm font-semibold text-on-accent hover:bg-royal-700 disabled:opacity-50"
        >
          {pending ? "Placing order…" : `Pay ${formatInr(cart.totalInr)}`}
        </button>
        <p className="mt-3 text-center text-xs text-ink-400">
          UPI, cards and netbanking · Payment is processed by our gateway, never stored here
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mt-4 block text-sm font-medium text-ink-900">{label}</span>
      <input
        name={name}
        type={type}
        {...rest}
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-royal-500 focus:outline-none"
      />
    </label>
  );
}
