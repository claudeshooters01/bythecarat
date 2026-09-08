/**
 * Every piece of brand copy the shell renders. Renaming the store, changing
 * the free-shipping threshold or the support number is a one-file edit.
 */
export const brand = {
  name: "By The Carat",
  nameLead: "By The",
  nameAccent: "Carat",
  tagline: "Diamond jewellery & antique timepieces",
  description:
    "Certified diamond jewellery and hand-restored antique watches, made for everyday wear and kept for generations.",
  supportEmail: "care@bythecarat.in",
  supportPhone: "+91 80 4718 2200",
  /** Order subtotal (paise) at or above which shipping is free. */
  freeShippingThresholdInr: 500000,
  /** Flat shipping charge (paise) below the threshold. Insured courier. */
  shippingFlatInr: 25000,
  /** GST on gems and jewellery. Basis points, so 300 = 3%. */
  gstBps: 300,
} as const;
