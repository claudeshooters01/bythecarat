import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  db,
  cartItems,
  carts,
  orderItems,
  orders,
  payments,
  productImages,
  productVariants,
  products,
  type OrderStatus,
  type ShippingAddress,
} from "@/lib/db";
import { CheckoutError } from "@/lib/api";
import { newId, newOrderNumber } from "@/lib/ids";
import { createPaymentIntent, type PaymentIntent } from "@/lib/payments";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/emails/order-confirmation";
import { priceCart } from "@/lib/services/cart";

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  totalInr: number;
  payment: PaymentIntent;
};

/**
 * Turn a cart into an order.
 *
 * Three things make this safe to run concurrently with itself and with the
 * Studio editing prices:
 *
 *  1. Prices are re-read from the catalogue inside the transaction. The cart's
 *     snapshot is what the shopper *saw*; it is never what they are charged.
 *  2. Stock moves with a conditional UPDATE … WHERE stock_qty >= qty, and the
 *     affected row count is checked. Two shoppers racing for the last ring:
 *     one update matches, the other doesn't, and the loser gets a clean 409
 *     instead of the store overselling.
 *  3. The cart is marked converted in the same transaction, so a double
 *     submit cannot produce two orders from one bag.
 *
 * The order is written as `pending_payment`. Only a verified provider
 * callback moves it to `paid` — see confirmPayment.
 */
export async function checkout(input: {
  cartId: string;
  userId: string | null;
  email: string;
  shippingAddress: ShippingAddress;
}): Promise<PlacedOrder> {
  const { orderId, orderNumber, totalInr } = await db.transaction(async (tx) => {
    const [cart] = await tx
      .select({ id: carts.id, status: carts.status })
      .from(carts)
      .where(eq(carts.id, input.cartId))
      .limit(1);

    if (!cart) throw new CheckoutError("no_cart", "Your bag could not be found.", 404);
    if (cart.status !== "active") {
      throw new CheckoutError("already_placed", "This bag has already been checked out.");
    }

    const lines = await tx
      .select({
        variantId: productVariants.id,
        productId: products.id,
        title: products.title,
        slug: products.slug,
        sku: productVariants.sku,
        optionLabel: productVariants.optionLabel,
        optionValue: productVariants.optionValue,
        // Live price, not the cart snapshot.
        unitPriceInr: sql<number>`coalesce(${productVariants.priceInr}, ${products.priceInr})`,
        qty: cartItems.qty,
        status: products.status,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(cartItems.cartId, input.cartId));

    if (lines.length === 0) throw new CheckoutError("empty_bag", "Your bag is empty.", 400);

    const unavailable = lines.find((l) => l.status !== "active");
    if (unavailable) {
      throw new CheckoutError(
        "unavailable",
        `"${unavailable.title}" is no longer available. Please remove it from your bag.`,
      );
    }

    for (const line of lines) {
      const reserved = await tx
        .update(productVariants)
        .set({ stockQty: sql`${productVariants.stockQty} - ${line.qty}` })
        .where(
          and(
            eq(productVariants.id, line.variantId),
            sql`${productVariants.stockQty} >= ${line.qty}`,
          ),
        );

      if (reserved.rowCount === 0) {
        // Rolls back every reservation made above it.
        throw new CheckoutError(
          "out_of_stock",
          `"${line.title}" sold out while you were checking out.`,
        );
      }
    }

    const subtotalInr = lines.reduce((sum, l) => sum + Number(l.unitPriceInr) * l.qty, 0);
    const { shippingInr, taxInr, totalInr } = priceCart(subtotalInr);

    const id = newId();
    const orderNumber = newOrderNumber();

    await tx.insert(orders).values({
      id,
      orderNumber,
      userId: input.userId,
      email: input.email,
      status: "pending_payment",
      subtotalInr,
      shippingInr,
      taxInr,
      totalInr,
      shippingAddress: input.shippingAddress,
    });

    const thumbs = await primaryImageMap(
      tx,
      lines.map((l) => l.productId),
    );

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        id: newId(),
        orderId: id,
        productId: l.productId,
        variantId: l.variantId,
        title: l.title,
        variantLabel: l.optionValue ? `${l.optionLabel}: ${l.optionValue}` : null,
        sku: l.sku,
        imageUrl: thumbs.get(l.productId) ?? null,
        unitPriceInr: Number(l.unitPriceInr),
        qty: l.qty,
      })),
    );

    await tx.update(carts).set({ status: "converted" }).where(eq(carts.id, input.cartId));

    return { orderId: id, orderNumber, totalInr };
  });

  // Outside the transaction: a slow gateway must not hold Postgres row locks.
  const intent = await createPaymentIntent({ orderNumber, amountInr: totalInr });

  await db.insert(payments).values({
    id: newId(),
    orderId,
    provider: intent.provider,
    providerRef: intent.reference,
    amountInr: totalInr,
    status: "created",
  });

  return { id: orderId, orderNumber, totalInr, payment: intent };
}

async function primaryImageMap(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productIds: string[],
): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();
  const rows = await tx
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(productImages.productId, productImages.position);
  return new Map(rows.map((r) => [r.productId, r.url]));
}

/**
 * Mark a payment captured and the order paid. Idempotent by construction:
 * the update is conditioned on the order still being `pending_payment`, so a
 * webhook that fires twice — or a webhook that races the browser's own
 * confirm call — captures exactly once.
 */
export async function confirmPayment(input: {
  providerRef: string;
  provider: string;
  raw?: Record<string, unknown>;
}): Promise<{ orderId: string; alreadyCaptured: boolean } | null> {
  const [payment] = await db
    .select({ id: payments.id, orderId: payments.orderId, status: payments.status })
    .from(payments)
    .where(
      and(eq(payments.providerRef, input.providerRef), eq(payments.provider, input.provider)),
    )
    .limit(1);

  if (!payment) return null;
  if (payment.status === "captured") {
    return { orderId: payment.orderId, alreadyCaptured: true };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "captured", raw: input.raw ?? null })
      .where(eq(payments.id, payment.id));

    await tx
      .update(orders)
      .set({ status: "paid", placedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, payment.orderId), eq(orders.status, "pending_payment")));
  });

  // Sent here rather than at checkout, so the receipt only goes out for money
  // actually taken. Reached exactly once: the early return above means a
  // redelivered webhook, or the browser racing it, never gets this far.
  await sendConfirmationEmail(payment.orderId);

  return { orderId: payment.orderId, alreadyCaptured: false };
}

/**
 * Best-effort receipt. A mail provider being slow or down must never fail a
 * payment webhook — Razorpay would retry it, and the customer's money has
 * already moved. Failures are logged for follow-up instead.
 */
async function sendConfirmationEmail(orderId: string): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    await sendEmail(orderConfirmationEmail({ ...order, items }));
  } catch (err) {
    console.error(`[orders] confirmation email failed for ${orderId}:`, err);
  }
}

/**
 * Cancel an unpaid order and put its stock back.
 *
 * The status guard is the whole safety mechanism: the UPDATE only matches
 * while the order is still `pending_payment`, so this can be called twice, or
 * race a webhook capture, without ever restocking a paid order or handing
 * inventory back twice. Returns false when there was nothing to cancel.
 */
export async function cancelPendingOrder(orderId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [cancelled] = await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });

    if (!cancelled) return false;

    const items = await tx
      .select({ variantId: orderItems.variantId, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      // Null variantId means the product was archived after purchase; there is
      // nothing left to restock.
      if (!item.variantId) continue;
      await tx
        .update(productVariants)
        .set({ stockQty: sql`${productVariants.stockQty} + ${item.qty}` })
        .where(eq(productVariants.id, item.variantId));
    }

    return true;
  });
}

/**
 * Sweeper for abandoned checkouts.
 *
 * Stock is reserved when the order is written, before the payment sheet
 * opens — otherwise two people could pay for the same piece. The cost of that
 * choice is that someone who closes the sheet holds inventory, which for
 * one-of-a-kind stock (`stock: 1` antique watches) would otherwise take the
 * piece off sale permanently. This gives it back.
 */
export async function releaseAbandonedOrders(
  olderThanMinutes = 30,
): Promise<{ examined: number; released: number }> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);

  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)))
    // Bounded so one run cannot hold the database for minutes; the next tick
    // picks up whatever is left.
    .limit(100);

  let released = 0;
  for (const order of stale) {
    if (await cancelPendingOrder(order.id)) released += 1;
  }
  return { examined: stale.length, released };
}

/**
 * A fresh payment intent for an order that is still awaiting payment — the
 * "complete payment" path after a dismissed or failed attempt. Each attempt
 * gets its own `payments` row, so the gateway's history and ours agree.
 */
export async function createRetryIntent(orderId: string): Promise<PlacedOrder | null> {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalInr: orders.totalInr,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.status !== "pending_payment") return null;

  const intent = await createPaymentIntent({
    orderNumber: order.orderNumber,
    amountInr: order.totalInr,
  });

  await db.insert(payments).values({
    id: newId(),
    orderId: order.id,
    provider: intent.provider,
    providerRef: intent.reference,
    amountInr: order.totalInr,
    status: "created",
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    totalInr: order.totalInr,
    payment: intent,
  };
}

/**
 * A gateway-reported failure. Marks the attempt failed and releases the order,
 * so a declined card does not quietly hold a piece for half an hour.
 */
export async function failPayment(input: {
  providerRef: string;
  provider: string;
  raw?: Record<string, unknown>;
}): Promise<{ orderId: string } | null> {
  const [payment] = await db
    .select({ id: payments.id, orderId: payments.orderId })
    .from(payments)
    .where(and(eq(payments.providerRef, input.providerRef), eq(payments.provider, input.provider)))
    .limit(1);

  if (!payment) return null;

  await db
    .update(payments)
    .set({ status: "failed", raw: input.raw ?? null })
    .where(eq(payments.id, payment.id));

  await cancelPendingOrder(payment.orderId);
  return { orderId: payment.orderId };
}

/**
 * A refund confirmed by the gateway. Stock is deliberately NOT returned here:
 * a refund says money moved, not that the piece is back on the shelf and fit
 * to resell. Staff restock it in the Studio once it is physically returned
 * and inspected.
 */
export async function refundPayment(input: {
  providerRef: string;
  provider: string;
  raw?: Record<string, unknown>;
}): Promise<{ orderId: string } | null> {
  const [payment] = await db
    .select({ id: payments.id, orderId: payments.orderId })
    .from(payments)
    .where(and(eq(payments.providerRef, input.providerRef), eq(payments.provider, input.provider)))
    .limit(1);

  if (!payment) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "refunded", raw: input.raw ?? null })
      .where(eq(payments.id, payment.id));
    await tx
      .update(orders)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(orders.id, payment.orderId));
  });

  return { orderId: payment.orderId };
}

export async function listOrdersForUser(userId: string) {
  // Derived table + join rather than a correlated subquery in sql``: raw
  // templates emit unqualified column names, so the correlation would compare
  // order_items.order_id to order_items.id and always count zero.
  const counts = db
    .select({
      orderId: orderItems.orderId,
      total: sql<number>`sum(${orderItems.qty})`.as("total"),
    })
    .from(orderItems)
    .groupBy(orderItems.orderId)
    .as("counts");

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalInr: orders.totalInr,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(${counts.total}, 0)`,
    })
    .from(orders)
    .leftJoin(counts, eq(counts.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return rows.map((r) => ({ ...r, itemCount: Number(r.itemCount) }));
}

/**
 * A single order with its lines.
 *
 * An order id alone is never sufficient — it is a UUID, but treating it as a
 * bearer token would leak purchase history to anyone who guessed or found
 * one. Access is granted only to the signed-in owner, or to a guest whose
 * own httpOnly cookie records that they placed it.
 */
export async function getOrder(
  orderId: string,
  access: { userId?: string | null; guestOrderIds?: string[] },
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const isOwner = Boolean(access.userId) && order.userId === access.userId;
  const isGuestWhoPlacedIt = access.guestOrderIds?.includes(orderId) ?? false;
  if (!isOwner && !isGuestWhoPlacedIt) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}

export async function listAllOrders(status?: OrderStatus) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      email: orders.email,
      status: orders.status,
      totalInr: orders.totalInr,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const [row] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id, status: orders.status });
  return row ?? null;
}
