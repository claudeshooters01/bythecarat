import type { ReactNode } from "react";
import { brand } from "@/lib/brand";

/**
 * Shared shell for the policy pages, so they read as one document set and a
 * wording change lands in one place rather than five.
 */
export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl text-ink-900 sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">{summary}</p>
      <p className="mt-2 text-xs text-ink-400">
        Last updated {brand.legal.policiesUpdated} · {brand.legal.entityName}
      </p>

      <div className="mt-10 space-y-9">{children}</div>

      <div className="mt-14 rounded-xl bg-royal-50 p-6 text-sm leading-relaxed text-ink-600">
        <p className="font-medium text-ink-900">Questions about this policy?</p>
        <p className="mt-1.5">
          Write to{" "}
          <a href={`mailto:${brand.supportEmail}`} className="text-royal-600 hover:underline">
            {brand.supportEmail}
          </a>{" "}
          or call{" "}
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}
            className="text-royal-600 hover:underline"
          >
            {brand.supportPhone}
          </a>
          . We answer in one working day.
        </p>
      </div>
    </div>
  );
}

export function Clause({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-ink-900">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}
