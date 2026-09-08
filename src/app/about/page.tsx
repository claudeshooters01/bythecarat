import type { Metadata } from "next";
import Image from "next/image";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Our story",
  description: brand.description,
};

const SECTIONS = [
  {
    id: "certification",
    title: "Certification",
    body: "Every diamond above 0.20ct ships with an independent IGI or GIA certificate, and the report number is engraved on the girdle so the stone and the paperwork can never be separated. Gold is BIS-hallmarked. Watches carry a dated restoration record listing every part replaced and every part kept original — because with an antique movement, what was left alone matters as much as what was repaired.",
  },
  {
    id: "care",
    title: "Care & servicing",
    body: "Bring any piece back for complimentary cleaning and re-polishing, as often as you like, for as long as you own it. Mechanical watches want a service every five to seven years; we will remind you when yours is due, and our workshop does the work in-house rather than sending it out.",
  },
  {
    id: "returns",
    title: "Returns & exchange",
    body: "Wear it for thirty days. If it isn't right, send it back for a full refund — worn, resized or not. After that, our lifetime exchange stands: trade any piece back at the full price you paid, against anything else in the house.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-panel px-4 py-20 text-on-panel">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-500">
            {brand.name}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight">
            We started with one stubborn idea.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-on-panel/75">
            That fine jewellery should be worn on ordinary days. That a watch built in 1958 has
            more to say than one built last quarter. And that neither should require a private
            appointment and a hushed voice to buy.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-3xl space-y-14 px-4 py-16">
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
          <Image
            src="https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=1400&q=80"
            alt="A jeweller's bench with hand tools and loupes"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-3xl text-ink-900">The workshop</h2>
          <p className="text-sm leading-relaxed text-ink-600">
            Our bench sits in Bengaluru, above the shop. Six goldsmiths, two gemmologists and a
            watchmaker who has been taking movements apart since 1991. Nothing is drop-shipped;
            nothing is finished by a supplier we have not stood next to. When a setting takes an
            extra week because the stone deserves it, it takes an extra week.
          </p>
          <p className="text-sm leading-relaxed text-ink-600">
            The antique watches come from estate sales and single-owner collections across India
            and Europe. We buy fewer than one in ten that we inspect. The ones we pass on are
            usually beautiful — and over-restored, which is a polite way of saying the history was
            polished off them.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-40 space-y-3">
            <h2 className="font-display text-3xl text-ink-900">{section.title}</h2>
            <p className="text-sm leading-relaxed text-ink-600">{section.body}</p>
          </section>
        ))}

        <section className="rounded-xl bg-royal-50 p-8">
          <h2 className="font-display text-2xl text-ink-900">Talk to a person</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Sizing, a stone you cannot find, or a movement you want us to look at — write or call.
            You will get one of us, not a queue.
          </p>
          <p className="mt-4 text-sm">
            <a href={`mailto:${brand.supportEmail}`} className="font-medium text-royal-600 hover:underline">
              {brand.supportEmail}
            </a>
            <span className="px-2 text-ink-400">·</span>
            <a
              href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}
              className="font-medium text-royal-600 hover:underline"
            >
              {brand.supportPhone}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
