import { handle, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createAddress, listAddresses } from "@/lib/services/addresses";
import { addressSchema } from "@/lib/validators";

export const GET = handle(async () => {
  const user = await getSession();
  if (!user) return unauthorized();
  return ok(await listAddresses(user.id));
});

export const POST = handle(async (req: Request) => {
  const user = await getSession();
  if (!user) return unauthorized();

  const input = addressSchema.parse(await req.json());
  return ok(await createAddress(user.id, input), { status: 201 });
});
