import { ProductCard } from "@/components/ProductCard";
import type { ProductCard as Card } from "@/lib/services/catalog";

export function ProductGrid({
  products,
  savedIds,
}: {
  products: Card[];
  savedIds?: Set<string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          saved={savedIds?.has(product.id)}
          // Only the first row is above the fold; the rest lazy-load.
          priority={i < 4}
        />
      ))}
    </div>
  );
}
