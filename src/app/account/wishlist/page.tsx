import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductGrid } from "@/components/ProductGrid";
import { getSession } from "@/lib/auth";
import { listWishlist } from "@/lib/services/wishlist";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/wishlist");

  const products = await listWishlist(user.id);
  const savedIds = new Set(products.map((p) => p.id));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink-900">Wishlist</h1>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-ink-600">
          Nothing saved yet.{" "}
          <Link href="/shop/jewellery" className="text-royal-600 hover:underline">
            Browse the collection
          </Link>{" "}
          and tap the heart on anything you want to come back to.
        </p>
      ) : (
        <div className="mt-8">
          <ProductGrid products={products} savedIds={savedIds} />
        </div>
      )}
    </div>
  );
}
