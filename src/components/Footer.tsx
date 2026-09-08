import Link from "next/link";
import { brand } from "@/lib/brand";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop/jewellery", label: "All jewellery" },
      { href: "/shop/watches", label: "Antique watches" },
      { href: "/collections", label: "Collections" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "The house",
    links: [
      { href: "/about", label: "Our story" },
      { href: "/about#certification", label: "Certification" },
      { href: "/about#care", label: "Care & servicing" },
      { href: "/refund-policy", label: "Returns & exchange" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/account", label: "My account" },
      { href: "/account", label: "Order history" },
      { href: "/account/wishlist", label: "Wishlist" },
      { href: "/cart", label: "Bag" },
    ],
  },
];

const POLICIES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refunds & cancellation" },
  { href: "/shipping-policy", label: "Shipping" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <span className="font-display text-2xl text-ink-900">
            {brand.nameLead} <span className="text-royal-600">{brand.nameAccent}</span>
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-ink-600">{brand.description}</p>
          <p className="pt-2 text-sm text-ink-600">
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-royal-600">
              {brand.supportEmail}
            </a>
            <br />
            <a href={`tel:${brand.supportPhone.replace(/\s/g, "")}`} className="hover:text-royal-600">
              {brand.supportPhone}
            </a>
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400">
              {col.title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-ink-600 hover:text-royal-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line px-4 py-5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} {brand.legal.entityName}. All diamonds are conflict-free
            and independently certified. Prices include GST.
          </p>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {POLICIES.map((policy) => (
              <Link
                key={policy.href}
                href={policy.href}
                className="text-ink-400 hover:text-royal-600"
              >
                {policy.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
