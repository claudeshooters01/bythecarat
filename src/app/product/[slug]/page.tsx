import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBag } from "@/components/AddToBag";
import { Price } from "@/components/Price";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductRail } from "@/components/ProductRail";
import { WishlistButton } from "@/components/WishlistButton";
import { getSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { getProductBySlug, listProducts } from "@/lib/services/catalog";
import { wishlistProductIds } from "@/lib/services/wishlist";
import { catalogQuerySchema } from "@/lib/validators";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Not found" };

  return {
    title: product.title,
    description: product.subtitle ?? product.description.slice(0, 160),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.subtitle ?? product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0].url] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getSession();
  const [related, savedIds] = await Promise.all([
    listProducts(
      catalogQuerySchema.parse({ category: product.category.slug, limit: "10" }),
    ),
    user ? wishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const inStock = product.variants.some((v) => v.stockQty > 0);
  const attributes = Object.entries(product.attributes ?? {});

  // Product schema so listings show price and availability directly in search.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: product.brand ?? brand.name },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "INR",
      price: (product.priceInr / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-600">
        <Link href={`/shop/${product.department}`} className="hover:text-royal-600">
          {product.department === "watches" ? "Antique watches" : "Diamond jewellery"}
        </Link>
        <span className="px-2 text-ink-400">/</span>
        <Link
          href={`/shop/${product.department}?category=${product.category.slug}`}
          className="hover:text-royal-600"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} title={product.title} />

        <div className="space-y-7">
          <div className="space-y-2">
            {product.brand && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                {product.brand}
              </p>
            )}
            <h1 className="font-display text-4xl leading-tight text-ink-900">{product.title}</h1>
            {product.subtitle && <p className="text-sm text-ink-600">{product.subtitle}</p>}
          </div>

          <Price priceInr={product.priceInr} compareAtInr={product.compareAtInr} size="lg" />
          <p className="-mt-5 text-xs text-ink-400">Inclusive of all taxes</p>

          <div className="flex items-start gap-3">
            <div className="flex-1">
              <AddToBag variants={product.variants} basePriceInr={product.priceInr} />
            </div>
            <WishlistButton productId={product.id} initialSaved={savedIds.has(product.id)} />
          </div>

          <div className="space-y-4 border-t border-line pt-6">
            <h2 className="font-display text-xl text-ink-900">About this piece</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {product.description}
            </p>
          </div>

          {attributes.length > 0 && (
            <div className="border-t border-line pt-6">
              <h2 className="font-display text-xl text-ink-900">Specifications</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {attributes.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-ink-600">{key}</dt>
                    <dd className="text-right font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <ul className="space-y-2 border-t border-line pt-6 text-sm text-ink-600">
            <li>Certified authenticity, documented with every order</li>
            <li>Insured, signature-on-delivery shipping across India</li>
            <li>30-day returns and lifetime exchange at full value</li>
            <li>
              Questions?{" "}
              <a href={`mailto:${brand.supportEmail}`} className="text-royal-600 hover:underline">
                {brand.supportEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-24">
        <ProductRail
          title="You may also like"
          products={related.items.filter((p) => p.id !== product.id).slice(0, 8)}
          savedIds={savedIds}
        />
      </div>
    </div>
  );
}
