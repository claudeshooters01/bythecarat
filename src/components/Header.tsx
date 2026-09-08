import Link from "next/link";
import { canManage, getSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { formatInr } from "@/lib/money";
import { listCategories } from "@/lib/services/catalog";
import { readCart } from "@/lib/services/cart";
import { LogoutButton } from "@/components/LogoutButton";
import { SearchBar } from "@/components/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Server component: the bag count is rendered from the database on every
 * request rather than hydrated from a client store, so it is correct on first
 * paint and correct across devices. Routes that change the bag call
 * router.refresh(), which re-runs exactly this.
 */
export async function Header() {
  // The session has to resolve first: a signed-in shopper's bag is found by
  // user id, which lets it follow them across devices.
  const user = await getSession();
  const [cart, categories] = await Promise.all([
    readCart(user?.id ?? null).catch(() => null),
    listCategories().catch(() => []),
  ]);

  const jewellery = categories.filter((c) => c.department === "jewellery").slice(0, 6);
  const watches = categories.filter((c) => c.department === "watches").slice(0, 4);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <p className="bg-royal-600 px-4 py-1.5 text-center text-xs text-on-accent">
        Complimentary insured shipping over {formatInr(brand.freeShippingThresholdInr)} · Lifetime
        exchange on every certified piece
      </p>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <span className="font-display text-2xl leading-none tracking-tight text-ink-900">
            {brand.nameLead} <span className="text-royal-600">{brand.nameAccent}</span>
          </span>
        </Link>

        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-1 md:ml-0" aria-label="Account">
          <ThemeToggle />

          <Link
            href="/account/wishlist"
            aria-label="Wishlist"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-600 hover:bg-royal-50 hover:text-ink-900"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M12 20.5 4.2 12.9a4.7 4.7 0 0 1 0-6.7 4.8 4.8 0 0 1 6.8 0l1 1 1-1a4.8 4.8 0 0 1 6.8 0 4.7 4.7 0 0 1 0 6.7Z" />
            </svg>
          </Link>

          <Link
            href="/cart"
            aria-label={`Bag, ${cart?.itemCount ?? 0} items`}
            className="relative grid h-8 w-8 place-items-center rounded-full text-ink-600 hover:bg-royal-50 hover:text-ink-900"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M6 7h12l1 13H5Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            {(cart?.itemCount ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-royal-600 px-1 text-[10px] font-semibold text-on-accent">
                {cart!.itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="ml-2 hidden items-center gap-3 text-sm sm:flex">
              <Link href="/account" className="font-medium text-ink-600 hover:text-ink-900">
                {user.name.split(" ")[0]}
              </Link>
              {canManage(user) && (
                <Link href="/studio" className="font-medium text-ink-600 hover:text-ink-900">
                  Studio
                </Link>
              )}
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 hidden rounded-full border border-royal-600 px-3.5 py-1.5 text-sm font-medium text-royal-600 hover:bg-royal-50 sm:block"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>

      {/* Category nav — scrolls horizontally on phones instead of collapsing
          into a drawer, so the merchandise stays one tap away. */}
      <div className="rail mx-auto flex w-full max-w-7xl gap-5 overflow-x-auto px-4 pb-2.5 text-sm">
        <NavLink href="/shop/jewellery" strong>
          Jewellery
        </NavLink>
        {jewellery.map((c) => (
          <NavLink key={c.id} href={`/shop/jewellery?category=${c.slug}`}>
            {c.name}
          </NavLink>
        ))}
        <span aria-hidden className="w-px shrink-0 bg-line" />
        <NavLink href="/shop/watches" strong>
          Watches
        </NavLink>
        {watches.map((c) => (
          <NavLink key={c.id} href={`/shop/watches?category=${c.slug}`}>
            {c.name}
          </NavLink>
        ))}
        <span aria-hidden className="w-px shrink-0 bg-line" />
        <NavLink href="/collections">Collections</NavLink>
        <NavLink href="/about">Our Story</NavLink>
      </div>

      <div className="border-t border-line px-4 py-2 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  strong = false,
}: {
  href: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap pb-0.5 hover:text-royal-600 ${
        strong ? "font-semibold text-ink-900" : "text-ink-600"
      }`}
    >
      {children}
    </Link>
  );
}
