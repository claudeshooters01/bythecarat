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
      { href: "/about#returns", label: "Returns & exchange" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/account", label: "My account" },
      { href: "/account/orders", label: "Order history" },
      { href: "/account/wishlist", label: "Wishlist" },
      { href: "/cart", label: "Bag" },
    ],
  },
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
        <p className="mx-auto w-full max-w-7xl text-xs text-ink-400">
          © {new Date().getFullYear()} {brand.name}. All diamonds are conflict-free and
          independently certified. Prices include GST.
        </p>
      </div>
    </footer>
  );
}
