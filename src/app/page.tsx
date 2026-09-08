import Image from "next/image";
import Link from "next/link";
import { ProductRail } from "@/components/ProductRail";
import { getSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { listCategories, listCollections, listProducts } from "@/lib/services/catalog";
import { wishlistProductIds } from "@/lib/services/wishlist";
import { catalogQuerySchema } from "@/lib/validators";

// Rendered per request: the session decides which hearts are filled. The
// expensive half — the catalogue queries — is behind the CDN via /api/v1, and
// the listing pages below are the ones that carry the crawl traffic.

export default async function HomePage() {
  const user = await getSession();

  const [newArrivals, everydayDiamonds, watches, collections, categories, savedIds] =
    await Promise.all([
      listProducts(catalogQuerySchema.parse({ limit: "10", sort: "newest" })),
      listProducts(catalogQuerySchema.parse({ collection: "everyday-solitaires", limit: "10" })),
      listProducts(catalogQuerySchema.parse({ department: "watches", limit: "10" })),
      listCollections({ featuredOnly: true }),
      listCategories("jewellery"),
      user ? wishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
    ]);

  return (
    <>
      <Hero />

      <div className="mx-auto w-full max-w-7xl space-y-20 px-4 py-16">
        <CategoryTiles categories={categories} />

        <ProductRail
          title="New this week"
          subtitle="Fresh from the atelier and the auction floor"
          href="/shop/jewellery?sort=newest"
          products={newArrivals.items}
          savedIds={savedIds}
        />

        {collections.length > 0 && <CollectionBand collections={collections} />}

        <ProductRail
          title="Everyday diamonds"
          subtitle="Certified solitaires and studs made to be worn, not stored"
          href="/collections/everyday-solitaires"
          products={everydayDiamonds.items}
          savedIds={savedIds}
        />

        <ProductRail
          title="The watch room"
          subtitle="Hand-restored mechanical timepieces, each with its service record"
          href="/shop/watches"
          products={watches.items}
          savedIds={savedIds}
        />

        <TrustBar />
      </div>
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-panel">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
        <div className="space-y-6 text-on-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-500">
            {brand.tagline}
          </p>
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
            Heirlooms you can
            <br />
            wear on a Tuesday.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-on-panel/75">
            Certified diamond jewellery, and antique watches restored by hand in our Bengaluru
            workshop. Made to be lived in — and passed on.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/shop/jewellery"
              className="rounded-full bg-on-panel px-7 py-3.5 text-sm font-semibold text-panel transition hover:bg-gold-100 hover:text-panel"
            >
              Shop jewellery
            </Link>
            <Link
              href="/shop/watches"
              className="rounded-full border border-on-panel/40 px-7 py-3.5 text-sm font-semibold text-on-panel transition hover:bg-on-panel/10"
            >
              Explore watches
            </Link>
          </div>
        </div>

        <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl lg:block">
          <Image
            src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80"
            alt="A diamond solitaire ring resting on a dark surface"
            fill
            sizes="50vw"
            priority
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function CategoryTiles({
  categories,
}: {
  categories: Awaited<ReturnType<typeof listCategories>>;
}) {
  if (categories.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-3xl text-ink-900">Shop by category</h2>
      <div className="rail mt-6 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
        {categories.slice(0, 6).map((category) => (
          <Link
            key={category.id}
            href={`/shop/jewellery?category=${category.slug}`}
            className="group w-32 shrink-0 text-center sm:w-auto"
          >
            <div className="relative aspect-square overflow-hidden rounded-full bg-royal-50">
              {category.imageUrl && (
                <Image
                  src={category.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 128px, 16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-ink-900 group-hover:text-royal-600">
              {category.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CollectionBand({
  collections,
}: {
  collections: Awaited<ReturnType<typeof listCollections>>;
}) {
  return (
    <section>
      <h2 className="font-display text-3xl text-ink-900">Collections</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {collections.slice(0, 3).map((collection) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.slug}`}
            className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-panel p-6"
          >
            {collection.heroImageUrl && (
              <Image
                src={collection.heroImageUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="-z-10 object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-panel via-panel/40 to-transparent" />
            <h3 className="font-display text-3xl text-on-panel">{collection.name}</h3>
            {collection.tagline && (
              <p className="mt-1 text-sm text-on-panel/75">{collection.tagline}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

const PROMISES = [
  {
    title: "Independently certified",
    body: "Every diamond ships with an IGI or GIA certificate. Every watch with its restoration record.",
  },
  {
    title: "Lifetime exchange",
    body: "Trade any piece back at full value against something new, for as long as you own it.",
  },
  {
    title: "Insured delivery",
    body: "Fully insured, signature-on-delivery shipping across India. Complimentary over ₹5,000.",
  },
  {
    title: "30-day returns",
    body: "Wear it, live with it, and send it back within 30 days if it isn't right.",
  },
];

function TrustBar() {
  return (
    <section className="grid gap-8 rounded-2xl bg-royal-50 p-10 sm:grid-cols-2 lg:grid-cols-4">
      {PROMISES.map((promise) => (
        <div key={promise.title}>
          <h3 className="font-display text-xl text-ink-900">{promise.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{promise.body}</p>
        </div>
      ))}
    </section>
  );
}
