import { forbidden, handle, notFound, ok, unauthorized } from "@/lib/api";
import { canManage, getSession } from "@/lib/auth";
import { archiveProduct, getProductForStudio, upsertProduct } from "@/lib/services/admin";
import { productWriteSchema } from "@/lib/validators";

/** Full product, including drafts — prefills the Studio edit form. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const { id } = await ctx.params;
  const product = await getProductForStudio(id);
  if (!product) return notFound("Product");
  return ok(product);
});

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
