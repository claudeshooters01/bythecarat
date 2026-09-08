import { handle, notFound, ok } from "@/lib/api";
import { getProductBySlug } from "@/lib/services/catalog";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug);
  if (!product) return notFound("Product");

  return ok(product, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
});
