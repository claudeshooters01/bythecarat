import Link from "next/link";
import type { Category } from "@/lib/db/schema";
import { PRODUCT_SORTS, type ProductSort } from "@/lib/validators";

const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

/**
 * Filters are links, not client state. Every combination is a real URL, so a
 * shopper can share "platinum rings under ₹1L", and Google can crawl it.
 */
export function FilterBar({
  basePath,
  params,
  categories,
  metals,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  categories: Category[];
  metals: string[];
}) {
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...patch })) {
      // Paging is per-filter-set: changing a filter must reset the cursor.
      if (value && key !== "cursor") next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="space-y-3 border-y border-line py-4">
      {categories.length > 0 && (
        <Chips label="Category">
          <Chip href={href({ category: undefined })} active={!params.category}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} href={href({ category: c.slug })} active={params.category === c.slug}>
              {c.name}
            </Chip>
          ))}
        </Chips>
      )}

      {metals.length > 0 && (
        <Chips label="Metal">
          <Chip href={href({ metal: undefined })} active={!params.metal}>
            Any
          </Chip>
          {metals.map((metal) => (
            <Chip key={metal} href={href({ metal })} active={params.metal === metal}>
              {metalLabel(metal)}
            </Chip>
          ))}
        </Chips>
      )}

      <Chips label="Sort">
        {PRODUCT_SORTS.map((sort) => (
          <Chip
            key={sort}
            href={href({ sort })}
            active={(params.sort ?? "newest") === sort}
          >
            {SORT_LABELS[sort]}
          </Chip>
        ))}
      </Chips>
    </div>
  );
}

/** "gold-18k" → "Gold 18k". Slugs are storage; shoppers read words. */
function metalLabel(metal: string): string {
  return metal.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Chips({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-widest text-ink-400">
        {label}
      </span>
      <div className="rail flex gap-2 overflow-x-auto">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition ${
        active
          ? "border-royal-600 bg-royal-600 font-medium text-on-accent"
          : "border-line text-ink-600 hover:border-royal-200 hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}
