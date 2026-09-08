import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-32 text-center">
      <p className="font-display text-6xl text-royal-600">404</p>
      <h1 className="mt-4 font-display text-3xl text-ink-900">This piece has moved on</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        The page you were looking for isn&apos;t here. It may have sold, or the link may be old.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/shop/jewellery"
          className="rounded-full bg-royal-600 px-6 py-3 text-sm font-semibold text-on-accent hover:bg-royal-700"
        >
          Shop jewellery
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink-900 hover:border-royal-200"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
