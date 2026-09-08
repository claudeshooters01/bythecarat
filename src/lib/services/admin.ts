import { desc, eq, sql } from "drizzle-orm";
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
    // rows, so the default variant is updated in place, never recreated.
    const [existingVariant] = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(productVariants.position)
      .limit(1);

    if (existingVariant) {
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

/** Studio catalogue list — includes drafts, which the storefront never shows. */
export async function listProductsForStudio() {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      department: products.department,
      priceInr: products.priceInr,
      status: products.status,
      updatedAt: products.updatedAt,
      stockQty: sql<number>`(
        select coalesce(sum(${productVariants.stockQty}), 0)
        from ${productVariants} where ${productVariants.productId} = ${products.id}
      )`,
    })
    .from(products)
    .orderBy(desc(products.updatedAt))
    .limit(200);
}

export async function archiveProduct(productId: string): Promise<boolean> {
  const rows = await db
    .update(products)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning({ id: products.id });
  return rows.length > 0;
}
