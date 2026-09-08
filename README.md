# By The Carat

A production-shaped storefront for a diamond jewellery and antique watch house.
Next.js 16 (App Router) · TypeScript · Drizzle + Postgres · Tailwind v4.

Royal blue palette, serif display type, dark mode, and a commerce core built to
survive real traffic: keyset pagination, integer money, guest carts that survive
sign-in, and stock that cannot be oversold.

## Quick start

Zero-setup local run — no Postgres install required:

```bash
npm install
cp .env.example .env    # then set AUTH_SECRET to any long random string
node scripts/dev/pglite-server.mjs &   # in-process Postgres on :5432
npm run db:setup        # push schema + seed the demo catalogue
npm run dev
```

With your own Postgres, skip the PGlite line, point `DATABASE_URL` at it, and
drop `DATABASE_POOL_MAX` from `.env`.

Seeded staff login: `studio@bythecarat.in` / `carat12345` → `/studio`.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Apply `src/lib/db/schema.ts` to the database |
| `npm run db:seed` | Idempotent demo catalogue + staff user |
| `npm run db:setup` | Both of the above |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, schema, API, UI, and the
  trade-offs behind each.
- [DEPLOY.md](DEPLOY.md) — Vercel + Neon + Razorpay, start to finish.
