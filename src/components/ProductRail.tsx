import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import type { ProductCard as Card } from "@/lib/services/catalog";

/** Horizontally swipeable row — the home page's merchandising unit. */
export function ProductRail({
  title,
  subtitle,
  href,
  products,
  savedIds,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: Card[];
  savedIds?: Set<string>;
}) {
  if (products.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl leading-tight text-ink-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 border-b border-royal-600/40 pb-0.5 text-sm font-medium text-royal-600 hover:border-royal-600"
          >
            View all
          </Link>
        )}
      </div>

      <div className="rail -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {products.map((product) => (
          <div key={product.id} className="w-44 shrink-0 sm:w-56">
            <ProductCard product={product} saved={savedIds?.has(product.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}
