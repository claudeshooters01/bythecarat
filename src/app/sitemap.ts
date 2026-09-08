import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db, collections, products } from "@/lib/db";
import { siteUrl } from "@/lib/site";

/**
 * Static pages plus every active product and collection. Capped at 5,000 —
 * past that this needs splitting into a sitemap index, and the cap is here so
 * the failure mode is a truncated sitemap rather than a timed-out route.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop/jewellery`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/shop/watches`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/collections`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // A sitemap is a hint, not a contract. If the database is briefly
  // unreachable — a Neon cold start, a deploy-time blip — serving the static
  // pages is strictly better than failing the build or handing Googlebot a
  // 500, and the next revalidation fills the rest back in.
  let productRows: Array<{ slug: string; updatedAt: Date }> = [];
  let collectionRows: Array<{ slug: string }> = [];
  try {
    [productRows, collectionRows] = await Promise.all([
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.status, "active"))
        .orderBy(desc(products.updatedAt))
        .limit(5000),
      db.select({ slug: collections.slug }).from(collections),
    ]);
  } catch (err) {
    console.error("[sitemap] catalogue query failed, serving static pages only:", err);
    return staticPages;
  }

  return [
    ...staticPages,
    ...collectionRows.map((c) => ({
      url: `${siteUrl}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...productRows.map((p) => ({
      url: `${siteUrl}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
