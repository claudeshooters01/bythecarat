"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { formatInr } from "@/lib/money";
import type { CartSummary } from "@/lib/services/cart";

/**
 * The bag. Seeded from the server render, then owned by the client while the
 * shopper adjusts quantities — every mutation returns the whole recomputed
 * cart, so totals can never drift from the lines above them.
 */
export function CartLines({ initial }: { initial: CartSummary }) {
  const [cart, setCart] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function setQty(itemId: string, qty: number) {
    setBusyId(itemId);
    setError(null);
    try {
      const next = await api<CartSummary>(`/api/v1/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ qty }),
      });
      setCart(next);
      router.refresh(); // header bag count
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your bag.");
    } finally {
      setBusyId(null);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-card px-6 py-16 text-center">
        <p className="font-display text-2xl text-ink-900">Your bag is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
          Every piece is certified, hallmarked and shipped insured.
        </p>
        <Link
          href="/shop/jewellery"
          className="mt-6 inline-block rounded-full bg-royal-600 px-7 py-3 text-sm font-semibold text-on-accent hover:bg-royal-700"
        >
          Start with jewellery
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
      <ul className="divide-y divide-line rounded-xl border border-line bg-card">
        {cart.lines.map((line) => (
          <li key={line.itemId} className="flex gap-4 p-4">
            <Link
              href={`/product/${line.slug}`}
              className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-paper"
            >
              {line.imageUrl && (
                <Image src={line.imageUrl} alt={line.title} fill sizes="96px" className="object-cover" />
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link href={`/product/${line.slug}`} className="text-sm font-medium text-ink-900 hover:text-royal-600">
                {line.title}
              </Link>
              {line.variantLabel && <p className="text-xs text-ink-600">{line.variantLabel}</p>}
              <p className="text-xs text-ink-400">SKU {line.sku}</p>

              <div className="mt-auto flex items-center gap-3 pt-2">
                <div className="flex items-center rounded-full border border-line">
                  <QtyButton
                    label="Decrease quantity"
                    disabled={busyId === line.itemId}
                    onClick={() => setQty(line.itemId, line.qty - 1)}
                  >
                    −
                  </QtyButton>
                  <span className="w-8 text-center text-sm tabular-nums">{line.qty}</span>
                  <QtyButton
                    label="Increase quantity"
                    disabled={busyId === line.itemId || line.qty >= line.stockQty}
                    onClick={() => setQty(line.itemId, line.qty + 1)}
                  >
                    +
                  </QtyButton>
                </div>
                <button
                  type="button"
                  onClick={() => setQty(line.itemId, 0)}
                  disabled={busyId === line.itemId}
                  className="text-xs text-ink-600 underline underline-offset-2 hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </div>

            <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
              {formatInr(line.lineTotalInr)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="rounded-xl border border-line bg-card p-6 lg:sticky lg:top-40">
        <h2 className="font-display text-2xl text-ink-900">Order summary</h2>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}

        <dl className="mt-5 space-y-2.5 text-sm">
          <Row label={`Subtotal (${cart.itemCount} items)`} value={formatInr(cart.subtotalInr)} />
          <Row
            label="Insured shipping"
            value={cart.shippingInr === 0 ? "Complimentary" : formatInr(cart.shippingInr)}
          />
          <Row label="GST" value={formatInr(cart.taxInr)} />
          <div className="border-t border-line pt-3">
            <Row label="Total" value={formatInr(cart.totalInr)} strong />
          </div>
        </dl>

        <Link
          href="/checkout"
          className="mt-6 block rounded-full bg-royal-600 px-6 py-3.5 text-center text-sm font-semibold text-on-accent hover:bg-royal-700"
        >
          Proceed to checkout
        </Link>
        <p className="mt-3 text-center text-xs text-ink-400">
          30-day returns · Lifetime exchange · Certified authenticity
        </p>
      </aside>
    </div>
  );
}

function QtyButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center text-ink-600 hover:text-ink-900 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-semibold text-ink-900" : "text-ink-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-ink-900" : "text-ink-900"}`}>
        {value}
      </dd>
    </div>
  );
}
