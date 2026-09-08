import { handle, ok } from "@/lib/api";
import { listProducts } from "@/lib/services/catalog";
import { catalogQuerySchema } from "@/lib/validators";

/** Public catalogue. Cursor-paginated, filterable, CDN-cacheable. */
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const query = catalogQuerySchema.parse(Object.fromEntries(url.searchParams));
  const page = await listProducts(query);

  return ok(page, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
});
