import { forbidden, handle, ok, unauthorized } from "@/lib/api";
import { canManage, getSession } from "@/lib/auth";
import { listProductsForStudio, upsertProduct } from "@/lib/services/admin";
import { productWriteSchema } from "@/lib/validators";

export const GET = handle(async () => {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();
  return ok(await listProductsForStudio());
});

export const POST = handle(async (req: Request) => {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const input = productWriteSchema.parse(await req.json());
  return ok(await upsertProduct(input), { status: 201 });
});
