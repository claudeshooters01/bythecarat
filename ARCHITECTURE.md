# Architecture

## 1. System

```
Browser
  │
  ├── Vercel Edge ── src/proxy.ts        coarse route gate (/account, /studio)
  │
  ▼
Next.js 16 App Router (Node runtime)
  │
  ├── Server Components ─── catalogue, cart, orders   (render from the DB)
  ├── Client islands ────── add-to-bag, bag, checkout, wishlist, studio
  └── Route handlers ────── /api/v1/*                 (uniform JSON envelope)
        │
        ▼
   services layer  ← the ONLY code that writes SQL
        │
        ▼
   Drizzle ORM ── node-postgres pool ──► Neon Postgres (pooled endpoint)
        │
        ├──► Vercel Blob        product imagery
        ├──► Upstash Redis      shared rate-limit windows (optional)
        └──► Payment seam ────► Razorpay | mock (dev/CI)
```

**Layering rule.** Pages and route handlers never touch Drizzle directly; they
call a service. That single rule is what makes the data model replaceable —
swapping ILIKE search for Postgres FTS, or Neon for RDS, is a change inside
`src/lib/services/`, not a change across forty files.

### Scaling posture

The MVP is small on purpose, but nothing here has to be undone to reach
millions of users:

| Concern | Decision | Why it survives growth |
| --- | --- | --- |
| Money | `integer` paise, everywhere | No float drift, no `numeric`→JS rounding |
| Listing pagination | Keyset cursor on `(sort key, id)` | O(page size) at any depth; `OFFSET 500000` is not |
| Listing images | One `DISTINCT ON` per page | Kills the classic per-card N+1 |
| Carts | DB rows keyed by cookie token | Survives sign-in, works across devices, is analysable |
| Stock | Conditional `UPDATE … WHERE stock_qty >= qty`, row count checked | Safe under concurrency without table locks |
| Payments | `UNIQUE (provider, provider_ref)` | Webhook redelivery is idempotent by construction |
| Prices | Snapshot on cart line and order line | Repricing the catalogue never rewrites history |
| Rate limits | Redis when present, in-memory fallback | Shared across serverless instances; fails open |

Known trade-offs, with the seam named:

- **Search** is `ILIKE`. Fine to ~100k products. Swap point: the `q` block in
  `listProducts` (`src/lib/services/catalog.ts`).
- **Variants** carry one option dimension (ring size, strap). Multi-axis
  variants mean a `variant_options` table; only `productVariants` and
  `AddToBag` are affected.
- **Every page is dynamic**, because the header renders the live bag count from
  the session. Getting product pages onto the CDN means moving the badge to a
  client fetch, or adopting PPR — the catalogue queries are already cacheable
  and are cached at `/api/v1`.
- **Emails** (order confirmations) are not wired. `confirmPayment` is the hook.

**A Drizzle footgun worth knowing.** Inside a raw ``sql`` `` template, Drizzle
emits *unqualified* column names. A correlated subquery like
``sql`select sum(qty) from ${orderItems} where ${orderItems.orderId} = ${orders.id}` ``
compiles to `where "order_id" = "id"`, where both sides resolve inside
`order_items` — so it silently returns zero rather than erroring. Aggregates
here therefore use a derived table plus a `leftJoin` (see
`listProductsForStudio` and `listOrdersForUser`), which the query builder
qualifies correctly.

## 2. File structure

```
src/
├── proxy.ts                    edge gate for /account and /studio
├── app/
│   ├── layout.tsx              shell, theme bootstrap, metadata
│   ├── page.tsx                home: hero, categories, rails, collections
│   ├── shop/[department]/      /shop/jewellery, /shop/watches + filters
│   ├── product/[slug]/         PDP with gallery, variants, JSON-LD
│   ├── collections/            index + /collections/[slug]
│   ├── search/  cart/  checkout/  about/  login/  signup/
│   ├── account/                orders, order detail, wishlist
│   ├── studio/                 staff catalogue + fulfilment
│   ├── sitemap.ts  robots.ts  not-found.tsx  globals.css
│   └── api/
│       ├── health/
│       └── v1/                 auth, products, categories, collections,
│                               cart, wishlist, addresses, checkout,
│                               orders, payments, studio
├── components/                 server + client UI, `studio/` for staff
└── lib/
    ├── db/{schema,index}.ts    tables; pooled Drizzle client
    ├── services/               catalog, cart, orders, users, wishlist,
    │                           addresses, admin
    ├── auth.ts                 JWT cookie sessions, bcrypt, role checks
    ├── api.ts                  response envelope + error mapping
    ├── validators.ts           every Zod schema
    ├── payments.ts             gateway seam + webhook signature
    ├── money.ts                paise ↔ ₹, Indian digit grouping
    ├── rate-limit.ts  ids.ts  brand.ts  site.ts  states.ts  client.ts
scripts/
├── seed.ts                     idempotent demo catalogue
└── dev/pglite-server.mjs       in-process Postgres for local dev
```

## 3. Database schema

Postgres. Enums for closed sets; `jsonb` only for genuinely open ones.

```
users ──┬── addresses
        ├── carts ── cart_items ──► product_variants
        ├── wishlist_items ──► products
        └── orders ──┬── order_items   (snapshots; nullable product refs)
                     └── payments      (UNIQUE provider+ref)

categories ──► products ──┬── product_images
collections ──────────────┼── product_variants
   via product_collections┘
```

Key columns and why:

- `products.price_inr` / `compare_at_inr` — paise. `metal` and `department` are
  promoted out of `attributes` because the listing page filters on them and a
  jsonb key cannot carry a useful btree index for that access pattern.
- `products.attributes jsonb` — carat/clarity for jewellery, movement/case for
  watches. One table, two very different spec sheets, no sparse columns.
- `product_variants` — every product has ≥1 (a "One size" default), so cart
  lines and stock always have somewhere to point.
- `cart_items` — `UNIQUE (cart_id, variant_id)`, so "add again" increments.
- `orders.shipping_address jsonb` — frozen. Editing the address book must not
  rewrite past invoices.
- `order_items` — title/SKU/image/price snapshots, `ON DELETE SET NULL` refs, so
  archiving a product cannot orphan an order.

Indexes exist for named queries: `products_dept_feed_idx`,
`products_category_feed_idx`, `products_price_idx`, `orders_user_idx`,
`orders_status_idx`, `carts_user_idx`, `bookmarks`-style composite PKs.

## 4. API

All under `/api/v1`. Success `{ data }`, failure `{ error: { code, message } }`.
Sessions are HTTP-only JWT cookies; carts an HTTP-only opaque token cookie.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/signup` `/auth/login` | — | Rate limited; merges the guest cart |
| POST | `/auth/logout` · GET `/auth/me` | — | |
| GET | `/products` | — | Filters, sort, keyset cursor; CDN-cached 60s |
| GET | `/products/[slug]` | — | Images + variants |
| GET | `/categories` `/collections` | — | CDN-cached 300s |
| GET | `/cart` | guest ok | |
| POST | `/cart/items` | guest ok | Creates the cart + cookie on demand |
| PATCH/DELETE | `/cart/items/[itemId]` | guest ok | `qty: 0` removes |
| GET/POST | `/wishlist` · DELETE `/wishlist/[productId]` | user | |
| GET/POST | `/addresses` · DELETE `/addresses/[id]` | user | |
| POST | `/checkout` | guest ok | Places the order, opens a payment intent |
| GET | `/orders` · `/orders/[id]` | user | Scoped to the caller |
| POST | `/payments/confirm` | — | Dev/mock only; real captures need the webhook |
| POST | `/payments/webhook` | signature | HMAC over the raw body; idempotent |
| GET/POST | `/studio/products` · PUT/DELETE `/studio/products/[id]` | staff | |
| PATCH | `/studio/orders/[id]` | staff | Fulfilment status |
| GET | `/api/health` | — | Liveness + DB reachability |

### Checkout, precisely

1. Cart resolved from the session or cookie — never from a client-supplied id.
2. In one transaction: reprice from the live catalogue, reserve stock with a
   conditional update, write `orders` + `order_items`, mark the cart converted.
3. Outside the transaction (so a slow gateway holds no row locks): create the
   payment intent, insert `payments` as `created`.
4. `confirmPayment` flips `payments → captured` and `orders → paid`, guarded on
   the order still being `pending_payment`. Webhook and browser callback race
   safely; the second one is a no-op.

## 5. UI

- **Server-first.** Catalogue, bag and orders render from the database, so the
  first paint is correct and indexable. Client components exist only where
  there is genuine interaction: `AddToBag`, `CartLines`, `CheckoutForm`,
  `WishlistButton`, `ProductGallery`, `SearchBar`, `LoadMore`, the Studio.
- **Filters are URLs, not state.** Every filter combination is a shareable,
  crawlable link, which is also why `FilterBar` is a server component.
- **Theming is tokens only.** `@theme` in `globals.css` defines the palette;
  `:root[data-theme="dark"]` redefines the same names. No component knows the
  theme. An inline script stamps `data-theme` before first paint.
- **`panel` / `on-panel`** are separate tokens from the `royal` scale: a
  deliberately dark surface (hero, collection tiles) must stay dark in both
  themes, whereas scale steps invert.
- **Money renders through one component** (`Price`) and one formatter
  (`formatInr`), so the discount badge can never disagree with the price.
- **Accessibility:** skip link, labelled controls, `aria-pressed` toggles,
  `role="alert"` errors, visible focus rings, reduced-motion honoured, and
  AA-or-better contrast in both themes.
