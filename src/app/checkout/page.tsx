import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getSession } from "@/lib/auth";
import { readCart } from "@/lib/services/cart";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getSession();
  const cart = await readCart(user?.id ?? null);

  // Nothing to pay for: send them back rather than rendering a dead form.
  if (cart.lines.length === 0) redirect("/cart");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink-900">Checkout</h1>

      {!user && (
        <p className="mt-3 text-sm text-ink-600">
          Checking out as a guest.{" "}
          <Link href="/login?next=/checkout" className="text-royal-600 hover:underline">
            Sign in
          </Link>{" "}
          to save this order to your account.
        </p>
      )}

      <div className="mt-8">
        <CheckoutForm cart={cart} defaultEmail={user?.email ?? ""} />
      </div>
    </div>
  );
}
