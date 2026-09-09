import { cookies } from "next/headers";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  cartItems,
  carts,
  productImages,
  productVariants,
  products,
} from "@/lib/db";
import { CheckoutError } from "@/lib/api";
import { priceCart } from "@/lib/pricing";
import { newId, newToken } from "@/lib/ids";
import { releaseExpiredHoldsForVariant } from "@/lib/services/orders";

const CART_COOKIE = "btc_cart";
const CART_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  variantLabel: string | null;
  sku: string;
  imageUrl: string | null;
  unitPriceInr: number;
  qty: number;
  stockQty: number;
  lineTotalInr: number;
};

export type CartSummary = {
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalInr: number;
  shippingInr: number;
  taxInr: number;
  totalInr: number;
};

const EMPTY: CartSummary = {
  cartId: null,
  lines: [],
  itemCount: 0,
  subtotalInr: 0,
  shippingInr: 0,
  taxInr: 0,
  totalInr: 0,
};

/* ── resolving which cart we are looking at ── */

/**
 * Read-only lookup: cart owned by the signed-in user, else the one named by
 * the guest cookie. Never writes, so it is safe to call during a server
 * render — Next forbids setting cookies there.
 */
async function findCart(userId: string | null): Promise<{ id: string } | null> {
  if (userId) {
    const [byUser] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.status, "active")))
      .orderBy(sql`${carts.updatedAt} desc`)
      .limit(1);
    if (byUser) return byUser;
  }

  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;

  const [byToken] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.token, token), eq(carts.status, "active")))
    .limit(1);
  return byToken ?? null;
}

/**
 * Same lookup, but creates the cart and issues the cookie when there is none.
 * Only safe inside route handlers and server actions.
 */
export async function getOrCreateCart(userId: string | null): Promise<string> {
  const existing = await findCart(userId);
  if (existing) return existing.id;

  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value ?? newToken();
  const id = newId();

  await db.insert(carts).values({ id, token, userId, status: "active" });

  store.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL_SECONDS,
  });
  return id;
}

/**
 * Called right after sign-in. Claims the guest cart for the user instead of
 * discarding it — abandoning a bag at the login wall is the most expensive
 * drop-off in retail. If the user already had a cart on another device, the
 * guest lines are folded into it and the guest cart is retired.
 */
export async function attachCartToUser(userId: string): Promise<void> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return;

  const [guest] = await db
    .select({ id: carts.id, userId: carts.userId })
    .from(carts)
    .where(and(eq(carts.token, token), eq(carts.status, "active")))
    .limit(1);
  if (!guest || guest.userId === userId) return;

  const [existing] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.userId, userId), eq(carts.status, "active")))
    .orderBy(sql`${carts.updatedAt} desc`)
    .limit(1);

  if (!existing) {
    await db.update(carts).set({ userId, updatedAt: new Date() }).where(eq(carts.id, guest.id));
    return;
  }

  await db.transaction(async (tx) => {
    const lines = await tx.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
    for (const line of lines) {
      await tx
        .insert(cartItems)
        .values({ ...line, id: newId(), cartId: existing.id })
        // Same piece in both bags: keep one line, take the larger quantity.
        .onConflictDoUpdate({
          target: [cartItems.cartId, cartItems.variantId],
          set: { qty: sql`greatest(${cartItems.qty}, ${line.qty})` },
        });
    }
    await tx.update(carts).set({ status: "abandoned" }).where(eq(carts.id, guest.id));
  });
}

/* ── reading and mutating ── */

export async function readCart(userId: string | null): Promise<CartSummary> {
  const cart = await findCart(userId);
  if (!cart) return EMPTY;
  return loadCart(cart.id);
}

export async function loadCart(cartId: string): Promise<CartSummary> {
  const rows = await db
    .select({
      itemId: cartItems.id,
      variantId: productVariants.id,
      productId: products.id,
      slug: products.slug,
      title: products.title,
      optionLabel: productVariants.optionLabel,
      optionValue: productVariants.optionValue,
      sku: productVariants.sku,
      unitPriceInr: cartItems.unitPriceInr,
      qty: cartItems.qty,
      stockQty: productVariants.stockQty,
      createdAt: cartItems.createdAt,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.createdAt);

  const images = await thumbnails(rows.map((r) => r.productId));

  const lines: CartLine[] = rows.map((r) => ({
    itemId: r.itemId,
    variantId: r.variantId,
    productId: r.productId,
    slug: r.slug,
    title: r.title,
    variantLabel: r.optionValue ? `${r.optionLabel}: ${r.optionValue}` : null,
    sku: r.sku,
    imageUrl: images.get(r.productId) ?? null,
    unitPriceInr: r.unitPriceInr,
    qty: r.qty,
    stockQty: r.stockQty,
    lineTotalInr: r.unitPriceInr * r.qty,
  }));

  const subtotalInr = lines.reduce((sum, l) => sum + l.lineTotalInr, 0);
  return {
    cartId,
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotalInr,
    ...priceCart(subtotalInr),
  };
}

async function thumbnails(productIds: string[]): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(productImages.productId, productImages.position);
  return new Map(rows.map((r) => [r.productId, r.url]));
}

export async function addToCart(
  cartId: string,
  input: { variantId: string; qty: number },
): Promise<CartSummary> {
  const [variant] = await db
    .select({
      id: productVariants.id,
      stockQty: productVariants.stockQty,
      // Variant price wins when set; otherwise the product's.
      priceInr: sql<number>`coalesce(${productVariants.priceInr}, ${products.priceInr})`,
      status: products.status,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(productVariants.id, input.variantId))
    .limit(1);

  if (!variant || variant.status !== "active") {
    throw new CheckoutError("unavailable", "That piece is no longer available.", 404);
  }

  let available = variant.stockQty;

  if (available < input.qty) {
    // Before refusing, check whether the shortfall is only abandoned
    // checkouts still holding this piece past their window. This is the one
    // moment the answer matters to anybody, and it keeps stock correct
    // without depending on how often the scheduled sweep is allowed to run.
    const released = await releaseExpiredHoldsForVariant(input.variantId);
    if (released > 0) {
      const [fresh] = await db
        .select({ stockQty: productVariants.stockQty })
        .from(productVariants)
        .where(eq(productVariants.id, input.variantId))
        .limit(1);
      available = fresh?.stockQty ?? available;
    }
  }

  if (available < input.qty) {
    throw new CheckoutError(
      "out_of_stock",
      available === 0 ? "That piece has just sold out." : `Only ${available} left in stock.`,
    );
  }

  await db
    .insert(cartItems)
    .values({
      id: newId(),
      cartId,
      variantId: input.variantId,
      qty: input.qty,
      unitPriceInr: Number(variant.priceInr),
    })
    // Adding the same piece again tops up the existing line, capped at stock.
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: {
        qty: sql`least(${cartItems.qty} + ${input.qty}, ${available})`,
        unitPriceInr: Number(variant.priceInr),
      },
    });

  await touch(cartId);
  return loadCart(cartId);
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  qty: number,
): Promise<CartSummary> {
  if (qty === 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  } else {
    const [line] = await db
      .select({ stockQty: productVariants.stockQty })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .limit(1);

    if (!line) throw new CheckoutError("not_in_bag", "That item is no longer in your bag.", 404);
    if (line.stockQty < qty) {
      throw new CheckoutError("out_of_stock", `Only ${line.stockQty} left in stock.`);
    }

    await db
      .update(cartItems)
      .set({ qty })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  }

  await touch(cartId);
  return loadCart(cartId);
}

async function touch(cartId: string): Promise<void> {
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export { CART_COOKIE };
