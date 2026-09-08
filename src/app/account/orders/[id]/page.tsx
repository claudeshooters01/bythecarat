import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { formatInr } from "@/lib/money";
import { getOrder } from "@/lib/services/orders";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const { placed } = await searchParams;

  const order = await getOrder(id, user.id);
  if (!order) notFound();

  const address = order.shippingAddress;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      {placed === "1" && (
        <div className="mb-8 rounded-xl bg-success-bg px-6 py-5">
          <h1 className="font-display text-2xl text-ink-900">Thank you — your order is placed.</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            A confirmation is on its way to {order.email}. Certificates travel with the parcel.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Order</p>
          <h2 className="font-display text-3xl text-ink-900">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-ink-600">
            Placed{" "}
            {new Date(order.placedAt ?? order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status === "pending_payment" && (
        <p className="mt-6 rounded-lg bg-gold-100 px-4 py-3 text-sm text-ink-900">
          We are still waiting on confirmation from your bank. This page updates automatically
          once the payment clears — no need to pay again. If it has been more than an hour, write
          to{" "}
          <a href={`mailto:${brand.supportEmail}`} className="underline">
            {brand.supportEmail}
          </a>
          .
        </p>
      )}

      <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-card">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 p-4">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-paper">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt={item.title} fill sizes="80px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{item.title}</p>
              {item.variantLabel && <p className="text-xs text-ink-600">{item.variantLabel}</p>}
              <p className="mt-0.5 text-xs text-ink-400">
                SKU {item.sku} · Qty {item.qty}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
              {formatInr(item.unitPriceInr * item.qty)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section>
          <h3 className="font-display text-xl text-ink-900">Shipping to</h3>
          <address className="mt-3 text-sm not-italic leading-relaxed text-ink-600">
            {address.fullName}
            <br />
            {address.line1}
            {address.line2 && (
              <>
                <br />
                {address.line2}
              </>
            )}
            <br />
            {address.city}, {address.state} {address.pincode}
            <br />
            {address.phone}
          </address>
        </section>

        <section>
          <h3 className="font-display text-xl text-ink-900">Payment</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal" value={formatInr(order.subtotalInr)} />
            <Row
              label="Insured shipping"
              value={order.shippingInr === 0 ? "Complimentary" : formatInr(order.shippingInr)}
            />
            <Row label="GST" value={formatInr(order.taxInr)} />
            <div className="border-t border-line pt-2">
              <Row label="Total" value={formatInr(order.totalInr)} strong />
            </div>
          </dl>
        </section>
      </div>

      <Link href="/account" className="mt-10 inline-block text-sm text-royal-600 hover:underline">
        ← All orders
      </Link>
    </div>
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
