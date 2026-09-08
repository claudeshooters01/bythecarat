import { and, desc, eq, sql } from "drizzle-orm";
import { db, productImages, productVariants, products } from "@/lib/db";
import { newId } from "@/lib/ids";
import { paise } from "@/lib/money";
import type { z } from "zod";
import type { productWriteSchema } from "@/lib/validators";

type ProductInput = z.infer<typeof productWriteSchema>;

/**
 * Create or replace a product with its images and default variant, in one
 * transaction. Images are replace-all rather than diffed: at this scale the
 * simpler write is worth more than the churn it saves, and it keeps ordering
 * exactly as the editor arranged it.
 */
export async function upsertProduct(input: ProductInput, productId?: string) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const values = {
      slug: input.slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description,
      department: input.department,
      categoryId: input.categoryId,
      brand: input.brand ?? null,
      priceInr: paise(input.price),
      compareAtInr: input.compareAt ? paise(input.compareAt) : null,
      metal: input.metal ?? null,
      attributes: input.attributes,
      status: input.status,
      isFeatured: input.isFeatured,
      // Stamped once, when the piece first goes live.
      publishedAt: input.status === "active" ? now : null,
      updatedAt: now,
    };

    let id = productId;

    if (id) {
      const [row] = await tx
        .update(products)
        .set({
          ...values,
          publishedAt: sql`coalesce(${products.publishedAt}, ${values.publishedAt})`,
        })
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (!row) return null;
    } else {
      id = newId();
      await tx.insert(products).values({ id, ...values });
    }

    await tx.delete(productImages).where(eq(productImages.productId, id));
    if (input.imageUrls.length > 0) {
      await tx.insert(productImages).values(
        input.imageUrls.map((url, position) => ({
          id: newId(),
          productId: id!,
          url,
          alt: input.title,
          position,
        })),
      );
    }

    // Every product needs at least one variant so cart lines and stock always
    // have somewhere to point. Editing stock must not orphan existing cart
    // rows, so variants are updated in place, never recreated.
    const [existingVariant] = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(productVariants.position)
      .limit(1);

    if (input.variantStock?.length) {
      // Per-variant edit. Scoped to this product, so an id from elsewhere
      // matches nothing rather than moving another product's stock.
      for (const v of input.variantStock) {
        await tx
          .update(productVariants)
          .set({ stockQty: v.stockQty })
          .where(and(eq(productVariants.id, v.id), eq(productVariants.productId, id)));
      }
    } else if (existingVariant) {
      await tx
        .update(productVariants)
        .set({ stockQty: input.stockQty })
        .where(eq(productVariants.id, existingVariant.id));
    } else {
      await tx.insert(productVariants).values({
        id: newId(),
        productId: id,
        sku: `${input.slug.toUpperCase().replace(/-/g, "").slice(0, 12)}-OS`,
        optionLabel: null,
        optionValue: null,
        stockQty: input.stockQty,
        position: 0,
      });
    }

    return { id };
  });
}

/**
 * One product, shaped for the Studio edit form. Unlike the storefront's
 * getProductBySlug this ignores status, so drafts and archived pieces can
 * still be opened and corrected.
 */
export async function getProductForStudio(productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return null;

  const [images, variants] = await Promise.all([
    db
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.position),
    db
      .select({
        id: productVariants.id,
        optionLabel: productVariants.optionLabel,
        optionValue: productVariants.optionValue,
        stockQty: productVariants.stockQty,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.position),
  ]);

  return { ...product, imageUrls: images.map((i) => i.url), variants };
}

/** Studio catalogue list — includes drafts, which the storefront never shows. */
export async function listProductsForStudio() {
  // Stock is aggregated in a derived table and joined, NOT written as a
  // correlated subquery inside sql``. Drizzle emits bare column names in raw
  // templates, so `where product_id = id` would resolve both sides inside
  // product_variants and silently match nothing.
  const stock = db
    .select({
      productId: productVariants.productId,
      total: sql<number>`sum(${productVariants.stockQty})`.as("total"),
    })
    .from(productVariants)
    .groupBy(productVariants.productId)
    .as("stock");

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      department: products.department,
      priceInr: products.priceInr,
      status: products.status,
      updatedAt: products.updatedAt,
      stockQty: sql<number>`coalesce(${stock.total}, 0)`,
    })
    .from(products)
    .leftJoin(stock, eq(stock.productId, products.id))
    .orderBy(desc(products.updatedAt))
    .limit(200);

  // sum() comes back as a bigint string over the wire.
  return rows.map((r) => ({ ...r, stockQty: Number(r.stockQty) }));
}

export async function archiveProduct(productId: string): Promise<boolean> {
  const rows = await db
    .update(products)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning({ id: products.id });
  return rows.length > 0;
}
