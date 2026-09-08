import { handle, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/services/orders";

export const GET = handle(async () => {
  const user = await getSession();
  if (!user) return unauthorized();
  return ok(await listOrdersForUser(user.id));
});
