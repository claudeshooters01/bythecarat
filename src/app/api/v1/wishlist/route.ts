import { handle, ok, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addToWishlist, listWishlist } from "@/lib/services/wishlist";
import { wishlistSchema } from "@/lib/validators";

export const GET = handle(async () => {
  const user = await getSession();
  if (!user) return unauthorized();
  return ok(await listWishlist(user.id));
});

export const POST = handle(async (req: Request) => {
  const user = await getSession();
  if (!user) return unauthorized();

  const { productId } = wishlistSchema.parse(await req.json());
  await addToWishlist(user.id, productId);
  return ok({ productId, saved: true }, { status: 201 });
});
