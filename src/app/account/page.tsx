import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { formatInr } from "@/lib/money";
import { listOrdersForUser } from "@/lib/services/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  // The proxy already gated this route; this makes the page safe on its own too.
  const user = await getSession();
  if (!user) redirect("/login?next=/account");

  const orders = await listOrdersForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink-900">Hello, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-sm text-ink-600">{user.email}</p>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/account/wishlist"
          className="rounded-full border border-line px-4 py-2 text-ink-900 hover:border-royal-200"
        >
          Wishlist
        </Link>
        <Link
          href="/shop/jewellery"
          className="rounded-full border border-line px-4 py-2 text-ink-900 hover:border-royal-200"
        >
          Continue shopping
        </Link>
      </nav>

      <h2 className="mt-14 font-display text-2xl text-ink-900">Orders</h2>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-ink-600">
          No orders yet.{" "}
          <Link href="/shop/jewellery" className="text-royal-600 hover:underline">
            Find something worth keeping.
          </Link>
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-card">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-royal-50/50"
              >
                <div>
                  <p className="font-medium text-ink-900">{order.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-ink-600">
                    {new Date(order.placedAt ?? order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" · "}
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-semibold tabular-nums text-ink-900">
                    {formatInr(order.totalInr)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
