# Going live

The complete runbook: database, payments, storage, Vercel, domain, and the
checks that prove it actually works. Follow it top to bottom.

Budget **3–7 days end to end** — not because the deployment is slow, but
because Razorpay KYC (step 3) takes days and cannot be rushed. Start that
first if you are in a hurry.

---

## 0. Before you start

| You need | Notes |
| --- | --- |
| The GitHub repo | `claudeshooters01/bythecarat`, already pushed |
| A [Neon](https://neon.tech) account | Postgres. Free tier is fine to launch |
| A [Vercel](https://vercel.com) account | Hosting. Free Hobby tier works; Pro if you want a team |
| A [Razorpay](https://razorpay.com) account | **Requires business KYC — start this first** |
| A domain | Wherever you buy it, you just need DNS access |
| Node 20+ locally | For the one-time schema push |

Razorpay KYC needs a registered business, PAN, bank account and (for
jewellery) possibly extra category documentation. Apply on day one.

---

## 1. Database — Neon

1. Create a Neon project.
2. **Region: pick the one closest to your customers.** For an India-first
   store choose a Mumbai or Singapore region if offered. Whatever you pick,
   note it — you will match Vercel's function region to it in step 6, and
   getting these on opposite sides of the world adds ~200ms to every query.
3. From the connection details, copy the **pooled** connection string. The
   host contains `-pooler`:

   ```
   postgres://user:pass@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```

   Use the pooled string, not the direct one. Serverless functions open many
   short-lived connections and will exhaust a direct endpoint.
4. Keep `?sslmode=require` on the end.

---

## 2. Create the schema and your admin user

This runs **from your machine**, once, against the production database.

Create a local `.env` (it is gitignored, and this is the only time it holds
production credentials):

```bash
AUTH_SECRET=<paste `openssl rand -base64 32`>
DATABASE_URL=<your Neon pooled string>
SITE_URL=https://your-domain.in
SEED_ADMIN_EMAIL=you@your-domain.in
SEED_ADMIN_PASSWORD=<a real, strong password — not the demo one>
```

**Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before you seed.** The seed
creates your staff login from those variables, and re-running it will *not*
overwrite a password later. Getting this right now saves you from shipping
with `carat12345`.

Then:

```bash
npm install
npm run db:push   # creates every table, enum and index
npm run db:seed   # categories, collections, your admin user, demo catalogue
```

**About the seed.** It is not optional. Products have a non-null foreign key
to `categories`, so without it you cannot create a single product. It gives
you the 10 categories, 3 collections and your staff login — plus 16 demo
products.

Those 16 demo products are placeholders with stock-photo imagery. Once you
have added real pieces in the Studio, open each demo one and **Archive** it.
Archive rather than delete: order history references products, and archived
rows disappear from the storefront while keeping any invoices intact.

Afterwards, delete `DATABASE_URL` from your local `.env` or point it back at
PGlite, so day-to-day development cannot touch production data.

> **A note on `db:push`.** It applies the schema directly, which is right for
> launch. Once you have real orders, move to generated SQL migrations
> (`drizzle-kit generate` + `migrate`) so schema changes are reviewable and
> reversible. Pushing against a live database with customer data is how you
> lose a column.

---

## 3. Before KYC: your legal identity and policy pages

Razorpay reviews your live website before activating an account, and expects
Terms, Privacy, Refund/Cancellation and Shipping policies plus contact details
to be publicly reachable. Those pages exist at `/terms`, `/privacy`,
`/refund-policy`, `/shipping-policy` and `/contact`, linked from every page's
footer.

**They contain placeholders you must replace.** Open `src/lib/brand.ts` and
fill in the `legal` block — entity name, registered address, GSTIN, CIN. Every
value is prefixed `[REPLACE]` and renders on the pages exactly as written, so a
reviewer will see them if you forget.

Read the policy wording too. It was drafted to match how this store is built
and how the copy elsewhere on the site describes the business — 30-day returns,
lifetime exchange, insured signature-on-delivery shipping, no COD. **Every one
of those is a promise you have to keep.** Have someone qualified review the
final wording; it is a starting point, not legal advice.

Deploy to the free `*.vercel.app` URL first (steps 6–7 work without a custom
domain) so these pages are live when Razorpay reviews you. Do not wait for DNS.

## 4. Payments — Razorpay

1. Complete KYC and activate the account. Until then you only have test keys.
2. **Settings → API Keys** → generate. You get a Key ID and a Key Secret. The
   secret is shown once — store it somewhere safe.
3. Leave the webhook for step 8; it needs your live domain.

**This is the one thing that must not be skipped.** With no Razorpay keys the
app falls back to a mock provider that marks every order paid instantly. That
is correct for local development and CI, and catastrophic in production — you
would ship a store that gives jewellery away. Step 8 verifies this explicitly.

---

## 5. Image storage — Vercel Blob

In Vercel: **Storage → Blob → Create**, then copy the read/write token.

This is required if you want to upload product photos from the Studio.
Without the token, uploads fall back to writing files on the server's disk —
which works locally but not on Vercel, where the filesystem is ephemeral and
read-only. Images would appear to upload and then vanish on the next deploy.

---

## 6. Rate limiting — Upstash (optional, recommended)

Create an [Upstash](https://upstash.com) Redis database and copy the **REST**
URL and token.

Without it, login/signup/checkout rate limits are per serverless instance
rather than global — weaker, but the app still works. Add it before you have
enough traffic for that to matter.

---

## 7. Deploy to Vercel

1. **Add New → Project**, import `claudeshooters01/bythecarat`.
2. Framework preset: Next.js. Build command, output directory and install
   command are all correct by default — change nothing.
3. Set the **function region** to match your Neon region from step 1
   (Project → Settings → Functions).
4. Add environment variables for **Production** and **Preview**:

| Variable | Value | Required |
| --- | --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` | **Yes** |
| `DATABASE_URL` | Neon **pooled** string | **Yes** |
| `SITE_URL` | `https://your-domain.in` | **Yes** |
| `RAZORPAY_KEY_ID` | From step 4 | **Yes, to take money** |
| `RAZORPAY_KEY_SECRET` | From step 4 | **Yes, to take money** |
| `RAZORPAY_WEBHOOK_SECRET` | From step 8 | **Yes, to take money** |
| `BLOB_READ_WRITE_TOKEN` | From step 5 | Yes, to upload images |
| `CRON_SECRET` | `openssl rand -base64 32` | **Yes** — see below |
| `RESEND_API_KEY` | resend.com → API Keys | **Yes** — otherwise no receipts |
| `EMAIL_FROM` | `By The Carat <orders@your-domain.in>` | With the above |
| `ORDER_HOLD_MINUTES` | Defaults to `30` | Optional |
| `UPSTASH_REDIS_REST_URL` | From step 6 | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | From step 6 | Optional |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | — | **No. Local seeding only** |

**`CRON_SECRET` is not optional.** A scheduled job (declared in `vercel.json`,
every 10 minutes) cancels orders left unpaid past the hold window and returns
their stock to the catalogue. Vercel sends the secret as an `Authorization`
header; without it the route refuses to run, and abandoned checkouts hold
inventory indefinitely. For one-of-a-kind stock that means a single abandoned
payment takes a piece off sale permanently.

`ORDER_HOLD_MINUTES` tunes how long an unpaid order holds its stock. Thirty
minutes suits one-of-a-kind pieces; raise it if you sell from deeper stock.

**Do not set `DATABASE_POOL_MAX`.** It exists for the local PGlite database,
which accepts one connection at a time. In production the default of 5 per
instance is what you want.

5. Deploy.

---

## 8. Domain and webhook

1. Vercel → **Settings → Domains** → add your domain, and create the DNS
   records it shows you at your registrar.
2. Once the domain resolves, set `SITE_URL` to the final `https://` domain and
   **redeploy**. It drives canonical URLs, `sitemap.xml`, `robots.txt` and the
   product JSON-LD — a stale value quietly damages SEO.
3. Razorpay → **Settings → Webhooks** → add:

   - URL: `https://your-domain.in/api/v1/payments/webhook`
   - Active event: **`payment.captured`**
   - Copy the generated **webhook secret**

4. Put that secret in Vercel as `RAZORPAY_WEBHOOK_SECRET` and redeploy.

The webhook is the *only* thing that marks an order paid in production. The
browser's own confirm call is refused whenever a real gateway is configured,
because a client POST is not proof of payment. No webhook secret means no
order is ever confirmed.

---

## 9. Verify — do not skip this

```bash
curl https://your-domain.in/api/health
# {"status":"ok","db":"up"}
```

Then, in order:

- [ ] `/sitemap.xml` lists your products, and `/robots.txt` points at **your**
      domain (not localhost or a `.vercel.app` URL)
- [ ] Sign up as a customer, add to bag, and complete a **real ₹1 order**
- [ ] Razorpay dashboard → Webhooks shows that delivery returning **200**
- [ ] The order flips to **paid** on its own, with nobody calling
      `/api/v1/payments/confirm`. **If it goes paid instantly, stop** — the
      mock provider is active and your Razorpay keys are not set
- [ ] Sign in to `/studio`, upload a product image, and confirm the URL is a
      `blob.vercel-storage.com` address. A `/uploads/…` path means
      `BLOB_READ_WRITE_TOKEN` is missing and the file will not survive a deploy
- [ ] Sign in as a normal customer and visit `/studio` — you must be bounced
      to the homepage
- [ ] Your staff password is not `carat12345`
- [ ] Start a checkout, close the payment sheet, and confirm you land on the
      order page with **Complete payment** and **Cancel this order** — then
      cancel, and check the piece is back on sale
- [ ] Vercel → Settings → Cron Jobs lists the release sweep and shows it
      returning 200
- [ ] A test order produces a **confirmation email**. If your Vercel logs show
      `[email] would send …`, `RESEND_API_KEY` is missing and customers are
      paying with no receipt
- [ ] No `[REPLACE]` text appears anywhere on `/terms`, `/privacy`,
      `/refund-policy`, `/shipping-policy` or `/contact`
- [ ] The 16 demo products are archived once your real catalogue is in

---

## 10. Running it

**Backups.** Enable Neon's point-in-time restore. `orders`, `order_items` and
`payments` are the only rows you cannot reconstruct from anywhere else.

**Rotating `AUTH_SECRET`** signs every customer out immediately. Shopping bags
survive — they are database rows keyed by a separate cookie, not session state.

**Caching.** `/api/v1/products`, `/categories` and `/collections` send
`s-maxage` headers and are served from Vercel's CDN. Pages themselves render
per request, because the header shows a live bag count.

**Deploys** happen on every push to `main`. Pull requests get preview URLs that
share the Production database unless you give Preview its own `DATABASE_URL` —
worth doing before anyone else joins the project.

---

## 11. Known gaps before real customers

Honest list of what this MVP does not do yet. None of it blocks launch, but
you should decide about each one deliberately:

- **Only one email exists** — the order confirmation, sent on payment capture.
  There is nothing for despatch, delivery, password reset or abandoned bags.
  `src/lib/email.ts` is the transport seam for adding them.
- **Refunds are initiated in Razorpay, not here.** The `refund.processed`
  webhook now marks the order refunded automatically, but nothing calls
  Razorpay's refund API, so a member of staff still starts the refund from
  their dashboard. Stock is deliberately not returned on refund — a refund
  says money moved, not that the piece is back and fit to resell; restock it
  in the Studio once it physically returns.
- **No GST invoice generation.** Tax is calculated and stored per order, but
  no invoice document is produced.
- **Search is `ILIKE`.** Fine to roughly 100k products. The swap point is one
  block in `listProducts` (`src/lib/services/catalog.ts`).
- **No COD.** Everything assumes prepaid. Adding it means a payment method on
  `orders`, COD-specific statuses, and a COD fee in `priceCart`.
- **One option dimension per product** (ring size, strap). Multi-axis variants
  need a `variant_options` table.
- **Demo imagery is stock photography** under Unsplash licence. Replace it
  with your own before launch.
