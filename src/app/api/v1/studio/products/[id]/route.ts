import { forbidden, handle, notFound, ok, unauthorized } from "@/lib/api";
import { canManage, getSession } from "@/lib/auth";
import { archiveProduct, upsertProduct } from "@/lib/services/admin";
import { productWriteSchema } from "@/lib/validators";

export const PUT = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const { id } = await ctx.params;
  const input = productWriteSchema.parse(await req.json());
  const result = await upsertProduct(input, id);
  if (!result) return notFound("Product");
  return ok(result);
});

/** Archive, never hard-delete: order history references these rows. */
export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const user = await getSession();
    if (!user) return unauthorized();
    if (!canManage(user)) return forbidden();

    const { id } = await ctx.params;
    const archived = await archiveProduct(id);
    if (!archived) return notFound("Product");
    return ok({ id, status: "archived" });
  },
);
