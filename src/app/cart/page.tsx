import type { Metadata } from "next";
import { CartLines } from "@/components/CartLines";
import { getSession } from "@/lib/auth";
import { readCart } from "@/lib/services/cart";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: false },
};

/** Open to guests by design — no sign-in wall between a shopper and their bag. */
export default async function CartPage() {
  const user = await getSession();
  const cart = await readCart(user?.id ?? null);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink-900">Your bag</h1>
      <div className="mt-8">
        <CartLines initial={cart} />
      </div>
    </div>
  );
}
