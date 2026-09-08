import type { Metadata } from "next";
import { LoadMore } from "@/components/LoadMore";
import { ProductGrid } from "@/components/ProductGrid";
import { SearchBar } from "@/components/SearchBar";
import { getSession } from "@/lib/auth";
import { listProducts } from "@/lib/services/catalog";
import { wishlistProductIds } from "@/lib/services/wishlist";
import { catalogQuerySchema } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Search",
  // Search result pages are thin and near-duplicate; keep them out of the index.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = catalogQuerySchema.parse(flat);

  const user = await getSession();
  const [page, savedIds] = await Promise.all([
    query.q ? listProducts(query) : Promise.resolve({ items: [], nextCursor: null }),
    user ? wishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink-900">Search</h1>

      <div className="mt-6 max-w-xl">
        <SearchBar autoFocus />
      </div>

      {query.q && (
        <p className="mt-6 text-sm text-ink-600">
          {page.items.length === 0
            ? `Nothing found for “${query.q}”.`
            : `Showing pieces matching “${query.q}”.`}
        </p>
      )}

      {page.items.length > 0 && (
        <div className="mt-8">
          <ProductGrid products={page.items} savedIds={savedIds} />
          {page.nextCursor && (
            <LoadMore
              initialCursor={page.nextCursor}
              query={`q=${encodeURIComponent(query.q ?? "")}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
