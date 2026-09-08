import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/LegalPage";
import { brand } from "@/lib/brand";
import { formatInr } from "@/lib/money";

export const metadata: Metadata = {
  title: "Shipping policy",
  description: "Insured, signature-on-delivery shipping across India.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Shipping policy"
      summary="Every parcel is fully insured and requires a signature. Nothing is left at a doorstep."
    >
      <Clause heading="Where we ship">
        <p>
          We ship across India. We do not currently ship internationally — write to us if you need
          a piece delivered abroad and we will tell you honestly whether we can arrange it.
        </p>
      </Clause>

      <Clause heading="What it costs">
        <p>
          Shipping is complimentary on orders of {formatInr(brand.freeShippingThresholdInr)} and
          above. Below that, a flat insured-courier charge of{" "}
          {formatInr(brand.shippingFlatInr)} applies. The exact amount is always shown before you
          pay.
        </p>
      </Clause>

      <Clause heading="How long it takes">
        <p>
          In-stock pieces are despatched within two working days. Delivery is typically two to
          four working days to metro cities and four to seven elsewhere.
        </p>
        <p>
          Made-to-order pieces — resized rings, full eternity bands, anything engraved — take about
          three weeks before despatch. The product page says so before you buy.
        </p>
      </Clause>

      <Clause heading="Insurance and delivery">
        <p>
          Every parcel is insured for its full value until it is signed for. Delivery requires a
          signature from an adult at the address; couriers will not leave jewellery or watches
          unattended, with a neighbour, or in a safe place.
        </p>
        <p>
          Parcels are deliberately discreet and carry no branding indicating the contents.
        </p>
      </Clause>

      <Clause heading="Tracking">
        <p>
          You receive a tracking reference by email when your order despatches, and your order page
          shows its current status.
        </p>
      </Clause>

      <Clause heading="If something goes wrong">
        <p>
          If a parcel is lost or arrives damaged, tell us within seven days of the expected
          delivery date. The insurance covers it and we will replace or refund — you are not out of
          pocket for a courier&rsquo;s mistake.
        </p>
        <p>
          If delivery fails because nobody was available or the address was wrong, the courier
          reattempts. After repeated failures the parcel returns to us and we contact you to
          rearrange.
        </p>
      </Clause>

      <Clause heading="Payment before despatch">
        <p>
          We do not currently offer cash on delivery. All orders are paid for before despatch.
        </p>
      </Clause>
    </LegalPage>
  );
}
