import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/*
 * Conventions that hold across every table here:
 *
 *  - Money is an INTEGER count of paise. Never a float, never a numeric that
 *    round-trips through JS as a float. ₹1,24,999.00 is 12499900.
 *  - Anything a customer has already seen a price for (cart line, order line)
 *    stores its own price snapshot. Repricing the catalogue must never
 *    silently reprice a cart or rewrite order history.
 *  - Indexes are declared for the exact query the app runs, and the query is
 *    named in a comment above it, so the two can be kept honest together.
 */

export const USER_ROLES = ["customer", "staff", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEPARTMENTS = ["jewellery", "watches"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CART_STATUSES = ["active", "converted", "abandoned"] as const;

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["created", "captured", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const departmentEnum = pgEnum("department", DEPARTMENTS);
export const productStatusEnum = pgEnum("product_status", PRODUCT_STATUSES);
export const cartStatusEnum = pgEnum("cart_status", CART_STATUSES);
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);

/* ─────────────────────────── identity ─────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    /**
     * Null for accounts created through Google — they have no password to
     * hash, and storing a placeholder would make "can this person sign in
     * with a password?" unanswerable.
     */
    passwordHash: text("password_hash"),
    /** Google's `sub` claim: stable, and unlike email it never changes. */
    googleId: text("google_id"),
    name: text("name").notNull(),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    // Partial: many rows have no google_id, and NULLs must not collide.
    uniqueIndex("users_google_id_idx").on(t.googleId).where(sql`${t.googleId} is not null`),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ─────────────────────────── catalogue ─────────────────────────── */

/** Navigation taxonomy: Rings, Earrings, Dress watches, … under a department. */
export const categories = pgTable(
  "categories",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    department: departmentEnum("department").notNull(),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    uniqueIndex("categories_slug_idx").on(t.slug),
    index("categories_department_idx").on(t.department, t.position),
  ],
);

/** Merchandising groupings — "Heirloom", "Everyday Solitaires". Cross-department. */
export const collections = pgTable(
  "collections",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    isFeatured: boolean("is_featured").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("collections_slug_idx").on(t.slug)],
);

/**
 * Attributes that differ per department (metal/purity/carat vs movement/case
 * size/water resistance) live in `attributes` jsonb rather than in a wide
 * sparse table. Facets the listing page filters on — price, metal, department
 * — are promoted to real indexed columns; the rest is display detail.
 */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description").notNull(),
    department: departmentEnum("department").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    brand: text("brand"),
    /** Display/sort price in paise. Variants may override it. */
    priceInr: integer("price_inr").notNull(),
    /** Struck-through MRP, in paise. Null when there is no discount. */
    compareAtInr: integer("compare_at_inr"),
    /** Promoted facet: "gold-18k", "platinum", "steel", … */
    metal: text("metal"),
    attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
    status: productStatusEnum("status").notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    // Listing: WHERE status='active' AND department=? ORDER BY published_at DESC
    index("products_dept_feed_idx").on(t.status, t.department, t.publishedAt),
    // Category listing, same shape.
    index("products_category_feed_idx").on(t.status, t.categoryId, t.publishedAt),
    // Sort by price within a filtered listing.
    index("products_price_idx").on(t.status, t.priceInr),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

/**
 * One option dimension per product — ring size, bangle diameter, strap length.
 * Every product has at least one variant (a "One size" default), so cart and
 * order lines can always reference a variant and stock is always countable.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    /** "Ring size", "Strap", … null for single-variant products. */
    optionLabel: text("option_label"),
    optionValue: text("option_value"),
    /** Overrides products.price_inr when set (larger sizes cost more gold). */
    priceInr: integer("price_inr"),
    stockQty: integer("stock_qty").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    uniqueIndex("product_variants_sku_idx").on(t.sku),
    index("product_variants_product_idx").on(t.productId, t.position),
  ],
);

export const productCollections = pgTable(
  "product_collections",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.collectionId] }),
    index("product_collections_collection_idx").on(t.collectionId, t.position),
  ],
);

/* ─────────────────────────── shopping ─────────────────────────── */

/**
 * Carts are rows, not cookies. A guest cart is addressed by an opaque `token`
 * cookie; signing in re-points that same cart at the user id, so nothing is
 * lost at the login boundary — the single most expensive drop-off in retail.
 */
export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    status: cartStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("carts_token_idx").on(t.token),
    // Find a signed-in shopper's live cart on another device.
    index("carts_user_idx").on(t.userId, t.status),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull().default(1),
    /** Price when it went into the bag; re-validated at checkout. */
    unitPriceInr: integer("unit_price_inr").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One line per variant per cart: "add again" increments instead of duplicating.
    uniqueIndex("cart_items_cart_variant_idx").on(t.cartId, t.variantId),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    index("wishlist_user_idx").on(t.userId, t.createdAt),
  ],
);

/* ─────────────────────────── orders ─────────────────────────── */

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    /** Human-facing, e.g. BTC-2K9F4M. Shown to customers and support. */
    orderNumber: text("order_number").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    subtotalInr: integer("subtotal_inr").notNull(),
    shippingInr: integer("shipping_inr").notNull().default(0),
    taxInr: integer("tax_inr").notNull().default(0),
    totalInr: integer("total_inr").notNull(),
    /** Frozen copy of the address. Editing the address book must not rewrite history. */
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    // Account → order history, newest first.
    index("orders_user_idx").on(t.userId, t.createdAt),
    // Studio → fulfilment queue by status.
    index("orders_status_idx").on(t.status, t.createdAt),
  ],
);

export type ShippingAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Nullable references: an archived product must never orphan an invoice.
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    // Snapshots — what the customer actually bought, as it read that day.
    title: text("title").notNull(),
    variantLabel: text("variant_label"),
    sku: text("sku").notNull(),
    imageUrl: text("image_url"),
    unitPriceInr: integer("unit_price_inr").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/**
 * One row per provider payment attempt. The unique index on
 * (provider, provider_ref) is what makes webhook delivery idempotent:
 * a duplicate callback conflicts instead of capturing an order twice.
 */
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref").notNull(),
    amountInr: integer("amount_inr").notNull(),
    status: paymentStatusEnum("status").notNull().default("created"),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_provider_ref_idx").on(t.provider, t.providerRef),
    index("payments_order_idx").on(t.orderId),
  ],
);

export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
