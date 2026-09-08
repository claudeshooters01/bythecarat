import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  categories,
  collections,
  productCollections,
  productImages,
  productVariants,
  products,
  type Department,
} from "@/lib/db";
import type { CatalogQuery } from "@/lib/validators";

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  priceInr: number;
  compareAtInr: number | null;
  department: Department;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type CatalogPage = { items: ProductCard[]; nextCursor: string | null };

/**
 * Keyset ("cursor") pagination. The cursor carries the sort key plus the id
 * tiebreaker, so paging stays O(page size) at any depth — the property that
 * matters once the catalogue and its crawlers grow. OFFSET does not have it.
 */
function encodeCursor(sortValue: number, id: string): string {
  return Buffer.from(`${sortValue}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { value: number; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString();
    const sep = raw.indexOf("_");
    if (sep < 1) return null;
    const value = Number(raw.slice(0, sep));
    if (!Number.isFinite(value)) return null;
    return { value, id: raw.slice(sep + 1) };
  } catch {
    return null;
  }
}

/** Escapes LIKE wildcards so shopper input is matched literally. */
function likePattern(input: string): string {
  return `%${input.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
}

/**
 * The one query behind every listing surface: department pages, category
 * pages, collection pages, search, and the "you may also like" rail.
 */
export async function listProducts(q: CatalogQuery): Promise<CatalogPage> {
  const conditions = [eq(products.status, "active")];

  if (q.department) conditions.push(eq(products.department, q.department));
  if (q.category) conditions.push(eq(categories.slug, q.category));
  if (q.metal) conditions.push(eq(products.metal, q.metal));
  if (q.minPrice != null) conditions.push(gte(products.priceInr, q.minPrice * 100));
  if (q.maxPrice != null) conditions.push(lte(products.priceInr, q.maxPrice * 100));

  if (q.q) {
    const pattern = likePattern(q.q);
    // ILIKE is right at MVP scale and the seam to Postgres full-text search
    // (or a search service) is this single block.
    conditions.push(
      or(
        ilike(products.title, pattern),
        ilike(products.subtitle, pattern),
        ilike(products.description, pattern),
        ilike(products.brand, pattern),
      )!,
    );
  }

  if (q.collection) {
    // Semi-join rather than a join, so a product in two collections cannot
    // appear twice on the page.
    conditions.push(
      sql`exists (
        select 1 from ${productCollections}
        join ${collections} on ${collections.id} = ${productCollections.collectionId}
        where ${productCollections.productId} = ${products.id}
          and ${collections.slug} = ${q.collection}
      )`,
    );
  }

  const cur = q.cursor ? decodeCursor(q.cursor) : null;

  // Each sort defines its keyset predicate and ORDER BY from one expression,
  // so the two can never drift apart. Both branches are SQL<number> rather
  // than "column or expression" — a union type here would defeat the
  // comparison helpers below.
  const sortColumn: SQL<number> =
    q.sort === "newest"
      ? sql<number>`extract(epoch from coalesce(${products.publishedAt}, ${products.createdAt})) * 1000`
      : sql<number>`${products.priceInr}`;
  const ascending = q.sort === "price_asc";

  if (cur) {
    conditions.push(
      ascending
        ? or(gt(sortColumn, cur.value), and(eq(sortColumn, cur.value), gt(products.id, cur.id)))!
        : or(lt(sortColumn, cur.value), and(eq(sortColumn, cur.value), lt(products.id, cur.id)))!,
    );
  }

  const orderBy = ascending
    ? [asc(sortColumn), asc(products.id)]
    : [desc(sortColumn), desc(products.id)];

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      subtitle: products.subtitle,
      priceInr: products.priceInr,
      compareAtInr: products.compareAtInr,
      department: products.department,
      sortValue: sortColumn,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    // One extra row tells us whether another page exists without a COUNT(*).
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  const images = await primaryImages(page.map((p) => p.id));

  const last = page.at(-1);
  return {
    items: page.map(({ sortValue: _sortValue, ...p }) => ({
      ...p,
      imageUrl: images.get(p.id)?.url ?? null,
      imageAlt: images.get(p.id)?.alt ?? null,
    })),
    nextCursor: hasMore && last ? encodeCursor(Number(last.sortValue), last.id) : null,
  };
}

/**
 * Primary image for a set of products in one round trip. Doing this as a
 * correlated subquery per row is the classic listing-page N+1; DISTINCT ON is
 * Postgres's answer.
 */
export async function primaryImages(
  productIds: string[],
): Promise<Map<string, { url: string; alt: string | null }>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(productImages.productId, productImages.position);

  return new Map(rows.map((r) => [r.productId, { url: r.url, alt: r.alt }]));
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/** Full product page payload: product, category, images, variants. */
export async function getProductBySlug(slug: string) {
  const [row] = await db
    .select({
      product: products,
      category: { slug: categories.slug, name: categories.name },
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.status, "active")))
    .limit(1);

  if (!row) return null;

  const [images, variants] = await Promise.all([
    db
      .select({ id: productImages.id, url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(eq(productImages.productId, row.product.id))
      .orderBy(productImages.position),
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        optionLabel: productVariants.optionLabel,
        optionValue: productVariants.optionValue,
        priceInr: productVariants.priceInr,
        stockQty: productVariants.stockQty,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, row.product.id))
      .orderBy(productVariants.position),
  ]);

  return { ...row.product, category: row.category, images, variants };
}

export async function listCategories(department?: Department) {
  return db
    .select()
    .from(categories)
    .where(department ? eq(categories.department, department) : undefined)
    .orderBy(categories.department, categories.position);
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export async function listCollections(opts: { featuredOnly?: boolean } = {}) {
  return db
    .select()
    .from(collections)
    .where(opts.featuredOnly ? eq(collections.isFeatured, true) : undefined)
    .orderBy(collections.position);
}

export async function getCollectionBySlug(slug: string) {
  const [row] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  return row ?? null;
}

/** Distinct metals present in a department — drives the listing filter chips. */
export async function listMetals(department?: Department): Promise<string[]> {
  const rows = await db
    .selectDistinct({ metal: products.metal })
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        sql`${products.metal} is not null`,
        department ? eq(products.department, department) : undefined,
      ),
    )
    .orderBy(products.metal);

  return rows.map((r) => r.metal).filter((m): m is string => Boolean(m));
}
