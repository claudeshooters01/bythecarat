import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/Price";
import { WishlistButton } from "@/components/WishlistButton";
import type { ProductCard as Card } from "@/lib/services/catalog";

export function ProductCard({
  product,
  saved = false,
  priority = false,
}: {
  product: Card;
  saved?: boolean;
  priority?: boolean;
}) {
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-card">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt ?? product.title}
              fill
              // Two columns on phones, up to five on wide screens — tells the
              // optimizer to serve a ~200px file to a phone, not a 1200px one.
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-ink-400">
              Image coming soon
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">
            {product.title}
          </h3>
          {product.subtitle && (
            <p className="line-clamp-1 text-xs text-ink-600">{product.subtitle}</p>
          )}
          <Price priceInr={product.priceInr} compareAtInr={product.compareAtInr} size="sm" />
        </div>
      </Link>

      {/* Outside the Link: a save must not navigate to the product. */}
      <WishlistButton productId={product.id} initialSaved={saved} floating />
    </article>
  );
}
