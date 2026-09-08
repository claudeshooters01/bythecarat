import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readCart } from "@/lib/services/cart";

export const GET = handle(async () => {
  const user = await getSession();
  return ok(await readCart(user?.id ?? null));
});
