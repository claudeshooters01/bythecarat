import { and, desc, eq } from "drizzle-orm";
import { db, products, wishlistItems } from "@/lib/db";
import { primaryImages, type ProductCard } from "@/lib/services/catalog";

export async function listWishlist(userId: string): Promise<ProductCard[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      subtitle: products.subtitle,
      priceInr: products.priceInr,
      compareAtInr: products.compareAtInr,
      department: products.department,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(products.id, wishlistItems.productId))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));

  const images = await primaryImages(rows.map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    imageUrl: images.get(r.id)?.url ?? null,
    imageAlt: images.get(r.id)?.alt ?? null,
  }));
}

/** Ids only — cheap enough to load on every listing page to light the hearts. */
export async function wishlistProductIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
  return new Set(rows.map((r) => r.productId));
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
}
