import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/LegalPage";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Refund & cancellation policy",
  description: "Returns within 30 days, lifetime exchange, and how refunds are processed.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & cancellation policy"
      summary="Thirty days to change your mind, a lifetime to change the piece."
    >
      <Clause heading="Cancelling before despatch">
        <p>
          You can cancel any order that has not yet shipped, at no charge. Use the cancel option
          on your order page if payment is still pending, or write to us and we will cancel and
          refund in full.
        </p>
      </Clause>

      <Clause heading="Returns within 30 days">
        <p>
          Return any piece within 30 days of delivery for a full refund. It may have been worn.
          Send it back with its certificate, box and any documentation it arrived with.
        </p>
        <p>
          Pieces that were engraved, resized or otherwise made to your specification cannot be
          returned unless they are faulty, because they cannot be resold. We tell you this on the
          product page before you buy.
        </p>
      </Clause>

      <Clause heading="Lifetime exchange">
        <p>
          Trade any piece back against another at the full price you paid, for as long as you own
          it. The piece must be intact and accompanied by its certificate. This is an exchange
          against new purchases, not a cash buy-back.
        </p>
      </Clause>

      <Clause heading="Faulty or misdescribed pieces">
        <p>
          If something arrives damaged, or does not match its description or certificate, tell us
          within seven days of delivery. We arrange collection at our cost and either repair,
          replace or refund in full, as you prefer.
        </p>
      </Clause>

      <Clause heading="How to start a return">
        <p>
          Email{" "}
          <a href={`mailto:${brand.supportEmail}`} className="text-royal-600 hover:underline">
            {brand.supportEmail}
          </a>{" "}
          with your order number. We arrange an insured pickup — please do not post jewellery or
          watches yourself, as ordinary post is not insured for these values and a loss in transit
          would not be covered.
        </p>
      </Clause>

      <Clause heading="How refunds are paid">
        <p>
          Refunds go back to the original payment method. We process them within three working
          days of receiving and inspecting the returned piece; your bank then typically takes five
          to seven working days to show the money, which is outside our control.
        </p>
        <p>
          Refunds include the GST you paid. Where shipping was charged and you are returning an
          entire order, we refund that too.
        </p>
      </Clause>

      <Clause heading="Antique watches">
        <p>
          The 30-day return applies to antique watches exactly as it does to jewellery. Age-related
          wear described on the product page is not a fault. Mechanical watches are sold serviced
          and running; if one stops within 30 days, that is covered.
        </p>
      </Clause>
    </LegalPage>
  );
}
