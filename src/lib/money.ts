/**
 * All money in this codebase is an integer count of paise. Rupees only exist
 * at the edges: parsed on input, formatted on output. Nothing in between ever
 * holds a fractional currency value.
 */

export const paise = (rupees: number): number => Math.round(rupees * 100);

/** ₹1,24,999 — Indian digit grouping, no decimals when the amount is whole. */
export function formatInr(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  }).format(rupees);
}

export function discountPercent(priceInr: number, compareAtInr: number | null): number | null {
  if (!compareAtInr || compareAtInr <= priceInr) return null;
  return Math.round(((compareAtInr - priceInr) / compareAtInr) * 100);
}
