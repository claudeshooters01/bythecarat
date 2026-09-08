import { handle, ok } from "@/lib/api";
import { listCollections } from "@/lib/services/catalog";

export const GET = handle(async (req: Request) => {
  const featuredOnly = new URL(req.url).searchParams.get("featured") === "true";

  return ok(await listCollections({ featuredOnly }), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
});
