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

  /*
   * Legal identity, shown on the policy pages and required by payment
   * gateways before they will activate an account.
   *
   * REPLACE EVERY VALUE MARKED [REPLACE] BEFORE LAUNCH. They are placeholders,
   * and a gateway reviewing your site will reject them.
   */
  legal: {
    /** Registered entity name, not the trading name. */
    entityName: "[REPLACE] By The Carat Jewellers Private Limited",
    /** Full registered address, as filed. */
    address: "[REPLACE] Registered address, Bengaluru, Karnataka 560025, India",
    gstin: "[REPLACE] 29AAAAA0000A1Z5",
    cin: "[REPLACE] U36910KA2026PTC000000",
    /** Date the current policy wording took effect. */
    policiesUpdated: "September 2026",
  },
} as const;
