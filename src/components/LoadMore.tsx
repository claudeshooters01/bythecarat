"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ProductCard } from "@/components/ProductCard";
import type { CatalogPage, ProductCard as Card } from "@/lib/services/catalog";

/**
 * Appends the next keyset page in place. The first page is server-rendered
 * for SEO and first paint; only shoppers who ask for more pay for more.
 */
export function LoadMore({
  initialCursor,
  query,
}: {
  initialCursor: string;
  /** The listing's filters, already serialised — reused verbatim per page. */
  query: string;
}) {
  const [items, setItems] = useState<Card[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setPending(true);
    setError(null);
    try {
      const page = await api<CatalogPage>(
        `/api/v1/products?${query}&cursor=${encodeURIComponent(cursor)}`,
      );
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load more pieces. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {items.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 text-center text-sm text-danger">
          {error}
        </p>
      )}

      {cursor && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-full border border-royal-600 px-8 py-3 text-sm font-semibold text-royal-600 hover:bg-royal-50 disabled:opacity-50"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
