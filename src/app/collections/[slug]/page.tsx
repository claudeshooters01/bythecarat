import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoadMore } from "@/components/LoadMore";
import { ProductGrid } from "@/components/ProductGrid";
import { getSession } from "@/lib/auth";
import { getCollectionBySlug, listProducts } from "@/lib/services/catalog";
import { wishlistProductIds } from "@/lib/services/wishlist";
import { catalogQuerySchema } from "@/lib/validators";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) return { title: "Not found" };
  return {
    title: collection.name,
    description: collection.tagline ?? collection.description ?? undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = catalogQuerySchema.parse({ ...flat, collection: slug });

  const user = await getSession();
  const [page, savedIds] = await Promise.all([
    listProducts(query),
    user ? wishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl text-ink-900 sm:text-5xl">{collection.name}</h1>
        {collection.tagline && <p className="mt-2 text-lg text-gold-600">{collection.tagline}</p>}
        {collection.description && (
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{collection.description}</p>
        )}
      </header>

      <div className="mt-10">
        {page.items.length === 0 ? (
          <p className="py-20 text-center text-sm text-ink-600">
            This collection is being restocked. Please check back shortly.
          </p>
        ) : (
          <>
            <ProductGrid products={page.items} savedIds={savedIds} />
            {page.nextCursor && (
              <LoadMore initialCursor={page.nextCursor} query={`collection=${slug}`} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
