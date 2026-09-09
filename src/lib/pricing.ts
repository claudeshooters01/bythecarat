import { brand } from "@/lib/brand";

/**
 * Order maths, in one place and depending on nothing.
 *
 * Rendering the bag, quoting checkout and writing the order row all call this,
 * so the number on the button is by construction the number that gets charged.
 * It lives outside the services layer because both the cart and the order
 * service need it, and a shared leaf module is what keeps those two from
 * importing each other.
 */
export function priceCart(subtotalInr: number): {
  shippingInr: number;
  taxInr: number;
  totalInr: number;
} {
  const shippingInr =
    subtotalInr === 0 || subtotalInr >= brand.freeShippingThresholdInr
      ? 0
      : brand.shippingFlatInr;
  const taxInr = Math.round((subtotalInr * brand.gstBps) / 10_000);
  return { shippingInr, taxInr, totalInr: subtotalInr + shippingInr + taxInr };
}
