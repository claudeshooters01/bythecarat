import { z } from "zod";
import { DEPARTMENTS, ORDER_STATUSES, PRODUCT_STATUSES } from "@/lib/db/schema";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().trim().min(1, "Name is required").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Listing/search query string. Every field optional; the page works bare. */
export const catalogQuerySchema = z.object({
  department: z.enum(DEPARTMENTS).optional(),
  category: z.string().trim().max(60).optional(),
  collection: z.string().trim().max(60).optional(),
  metal: z.string().trim().max(40).optional(),
  q: z.string().trim().max(100).optional(),
  // Rupees on the wire, paise everywhere inside.
  minPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  sort: z.enum(PRODUCT_SORTS).default("newest"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const addToCartSchema = z.object({
  variantId: z.string().trim().min(1).max(64),
  qty: z.coerce.number().int().min(1).max(10).default(1),
});

/** qty 0 is the delete signal, so the bag needs one endpoint, not two. */
export const updateCartItemSchema = z.object({
  qty: z.coerce.number().int().min(0).max(10),
});

const PINCODE = /^[1-9][0-9]{5}$/;
const PHONE = /^[6-9][0-9]{9}$/;

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter the recipient's name").max(80),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+91|91)/, ""))
    .refine((s) => PHONE.test(s), "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().trim().min(4, "Please enter the street address").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().refine((s) => PINCODE.test(s), "Enter a valid 6-digit PIN code"),
});

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  shippingAddress: addressSchema,
});

export const wishlistSchema = z.object({
  productId: z.string().trim().min(1).max(64),
});

/* ── Studio (staff) ── */

export const productWriteSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens"),
  title: z.string().trim().min(3).max(140),
  subtitle: z.string().trim().max(160).optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().min(20, "Describe the piece in at least 20 characters").max(4000),
  department: z.enum(DEPARTMENTS),
  categoryId: z.coerce.number().int().positive(),
  brand: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
  // Rupees in the form; converted to paise by the service.
  price: z.coerce.number().min(1).max(100_000_000),
  compareAt: z.coerce.number().min(0).max(100_000_000).optional(),
  metal: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
  attributes: z.record(z.string().max(60), z.string().max(200)).default({}),
  imageUrls: z.array(z.string().trim().url().max(2000)).max(8).default([]),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  isFeatured: z.coerce.boolean().default(false),
  stockQty: z.coerce.number().int().min(0).max(100000).default(0),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
