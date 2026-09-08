import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Reach ${brand.name} by email or phone — you get a person, not a queue.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl text-ink-900 sm:text-5xl">Contact us</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        Sizing, a stone you cannot find, a movement you want us to look at, or an order that needs
        chasing. You will get one of us, not a queue.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="font-display text-xl text-ink-900">Email</h2>
          <p className="mt-2 text-sm text-ink-600">Answered within one working day.</p>
          <a
            href={`mailto:${brand.supportEmail}`}
            className="mt-3 inline-block text-sm font-medium text-royal-600 hover:underline"
          >
            {brand.supportEmail}
          </a>
        </section>

        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="font-display text-xl text-ink-900">Phone</h2>
          <p className="mt-2 text-sm text-ink-600">Monday to Saturday, 10am–7pm IST.</p>
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}
            className="mt-3 inline-block text-sm font-medium text-royal-600 hover:underline"
          >
            {brand.supportPhone}
          </a>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-line bg-card p-6">
        <h2 className="font-display text-xl text-ink-900">Registered office</h2>
        <address className="mt-2 text-sm not-italic leading-relaxed text-ink-600">
          {brand.legal.entityName}
          <br />
          {brand.legal.address}
          <br />
          GSTIN {brand.legal.gstin}
          <br />
          CIN {brand.legal.cin}
        </address>
      </section>

      <section className="mt-6 rounded-xl bg-royal-50 p-6">
        <h2 className="font-display text-xl text-ink-900">About an order</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Quote your order number — it looks like BTC-7K4M9Q2X and is on your confirmation email
          and order page. If you have an account, your orders are under{" "}
          <Link href="/account" className="text-royal-600 hover:underline">
            My account
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
