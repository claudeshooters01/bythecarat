import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FilterBar } from "@/components/FilterBar";
import { LoadMore } from "@/components/LoadMore";
import { ProductGrid } from "@/components/ProductGrid";
import { getSession } from "@/lib/auth";
import { DEPARTMENTS, type Department } from "@/lib/db/schema";
import { listCategories, listMetals, listProducts } from "@/lib/services/catalog";
import { wishlistProductIds } from "@/lib/services/wishlist";
import { catalogQuerySchema } from "@/lib/validators";

type Props = {
  params: Promise<{ department: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const COPY: Record<Department, { title: string; blurb: string }> = {
  jewellery: {
    title: "Diamond jewellery",
    blurb:
      "Certified solitaires, everyday studs and hand-set pieces in 18k gold and platinum. Each one hallmarked, each one made to be worn.",
  },
  watches: {
    title: "Antique watches",
    blurb:
      "Mechanical timepieces from the 1930s onward, restored by hand in our workshop and sold with a full service record.",
  },
};

function parseDepartment(value: string): Department | null {
  return DEPARTMENTS.includes(value as Department) ? (value as Department) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const department = parseDepartment((await params).department);
  if (!department) return {};
  return { title: COPY[department].title, description: COPY[department].blurb };
}

/** Both storefront listings are this one page; only the copy differs. */
export default async function DepartmentPage({ params, searchParams }: Props) {
  const department = parseDepartment((await params).department);
  if (!department) notFound();

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = catalogQuerySchema.parse({ ...flat, department });

  const user = await getSession();
  const [page, categories, metals, savedIds] = await Promise.all([
    listProducts(query),
    listCategories(department),
    listMetals(department),
    user ? wishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  // The filter set, minus paging — LoadMore reuses it for every later page.
  const listQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...flat, department })) {
    if (value && key !== "cursor") listQuery.set(key, String(value));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl text-ink-900 sm:text-5xl">
          {COPY[department].title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{COPY[department].blurb}</p>
      </header>

      <div className="mt-8">
        <FilterBar
          basePath={`/shop/${department}`}
          params={flat as Record<string, string | undefined>}
          categories={categories}
          metals={metals}
        />
      </div>

      {page.items.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-600">
          Nothing matches those filters yet. Try widening them.
        </p>
      ) : (
        <div className="mt-8">
          <ProductGrid products={page.items} savedIds={savedIds} />
          {page.nextCursor && (
            <LoadMore initialCursor={page.nextCursor} query={listQuery.toString()} />
          )}
        </div>
      )}
    </div>
  );
}
