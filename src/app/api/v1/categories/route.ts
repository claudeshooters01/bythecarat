import { handle, ok } from "@/lib/api";
import { listCategories } from "@/lib/services/catalog";
import { DEPARTMENTS, type Department } from "@/lib/db/schema";

export const GET = handle(async (req: Request) => {
  const raw = new URL(req.url).searchParams.get("department");
  const department = DEPARTMENTS.includes(raw as Department) ? (raw as Department) : undefined;

  return ok(await listCategories(department), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
});
