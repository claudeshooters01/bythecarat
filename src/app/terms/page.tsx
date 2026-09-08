import type { Metadata } from "next";
import Link from "next/link";
import { Clause, LegalPage } from "@/components/LegalPage";
import { brand } from "@/lib/brand";
import { formatInr } from "@/lib/money";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms on which ${brand.name} sells jewellery and watches.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      summary={`These terms govern your use of this website and any order you place with ${brand.legal.entityName}. By placing an order you accept them.`}
    >
      <Clause heading="Who you are buying from">
        <p>
          This store is operated by {brand.legal.entityName}, registered at{" "}
          {brand.legal.address} (GSTIN {brand.legal.gstin}, CIN {brand.legal.cin}).
          &ldquo;We&rdquo; and &ldquo;us&rdquo; mean that company; &ldquo;you&rdquo; means the
          person placing the order.
        </p>
      </Clause>

      <Clause heading="Orders and acceptance">
        <p>
          Adding an item to your bag or completing payment is an offer to buy, not a concluded
          sale. A contract forms only when we confirm despatch. We may decline or cancel an order
          before despatch — for example if a piece is no longer available, if it was listed at a
          manifestly incorrect price, or if we cannot verify the payment. Where we cancel, we
          refund in full.
        </p>
        <p>
          Antique watches and hand-set pieces are frequently one of a kind. Stock is held for you
          for a limited period once you begin checkout; if payment is not completed within that
          window, the piece returns to sale.
        </p>
      </Clause>

      <Clause heading="Prices, tax and payment">
        <p>
          Prices are in Indian Rupees and include GST at the applicable rate for gems and
          jewellery. Shipping is charged as set out in our{" "}
          <Link href="/shipping-policy" className="text-royal-600 hover:underline">
            shipping policy
          </Link>
          , and is complimentary on orders of {formatInr(brand.freeShippingThresholdInr)} or more.
        </p>
        <p>
          Payments are processed by our payment gateway. We never see or store your card, UPI or
          banking credentials. Prices may change at any time, but a change never affects an order
          already placed.
        </p>
      </Clause>

      <Clause heading="Descriptions, certification and photography">
        <p>
          We describe every piece as accurately as we can, including diamond weight, clarity,
          metal purity and, for watches, movement and service history. Certification accompanies
          pieces where stated on the product page.
        </p>
        <p>
          Antique watches are pre-owned and are sold in the condition described. Age-related wear
          is expected and is part of the object. Photography is representative; natural stones and
          patina vary, and screens render colour differently.
        </p>
      </Clause>

      <Clause heading="Returns and cancellation">
        <p>
          Your rights to return, exchange and refund are set out in our{" "}
          <Link href="/refund-policy" className="text-royal-600 hover:underline">
            refund and cancellation policy
          </Link>
          , which forms part of these terms.
        </p>
      </Clause>

      <Clause heading="Your account">
        <p>
          You are responsible for keeping your password confidential and for activity under your
          account. Tell us immediately if you believe it has been compromised. We may suspend an
          account we reasonably believe is being used fraudulently.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          Nothing in these terms limits liability that cannot lawfully be limited, including for
          death or personal injury caused by negligence, or for fraud. Subject to that, our total
          liability in connection with an order is limited to the amount you paid for it.
        </p>
      </Clause>

      <Clause heading="Governing law">
        <p>
          These terms are governed by the laws of India, and the courts at Bengaluru, Karnataka
          have exclusive jurisdiction over any dispute.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          We may update these terms. The version in force for your order is the one published when
          you placed it.
        </p>
      </Clause>
    </LegalPage>
  );
}
