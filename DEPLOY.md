# Deploying to Vercel + Neon

## 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string — the host contains `-pooler`. The
   direct host will exhaust connections under serverless traffic.
3. Keep `?sslmode=require` on the end.

## 2. Payments (Razorpay)

1. Dashboard → Settings → API Keys → generate a key pair.
2. Dashboard → Settings → Webhooks → add
   `https://<your-domain>/api/v1/payments/webhook`, event **`payment.captured`**,
   and copy the webhook secret.

Without `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` the app falls back to a mock
provider that captures immediately. That is correct for local dev and CI, and
must never be the state of a production deployment — see the checklist below.

## 3. Vercel

Import the repo, then set environment variables (Production + Preview):

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `DATABASE_URL` | Neon pooled string |
| `SITE_URL` | `https://your-domain` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | From step 2 |
| `RAZORPAY_WEBHOOK_SECRET` | From step 2 |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob (optional) |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | Optional, recommended |

Do **not** set `DATABASE_POOL_MAX` in production; the default of 5 per instance
is right for Neon's pooler.

Then deploy, and initialise the schema once from your machine with production
credentials in `.env`:

```bash
npm run db:push
npm run db:seed   # optional: demo catalogue + staff user
```

## 4. First-run checklist

- [ ] `GET /api/health` returns `{"status":"ok","db":"up"}`
- [ ] `/sitemap.xml` and `/robots.txt` resolve, and robots points at your domain
- [ ] Sign up, add to bag, and complete a real ₹1 order end to end
- [ ] Razorpay dashboard shows the webhook delivering **200**
- [ ] The order flips to `paid` **without** anyone calling `/payments/confirm`
- [ ] Change the seeded staff password, or delete that user and make your own
- [ ] `AUTH_SECRET` is not the example value (rotating it signs everyone out)

## 5. Operational notes

- **Rate limits** are per-instance until Upstash is configured. Add it before
  you have enough traffic for that to matter.
- **Rotating `AUTH_SECRET`** invalidates every session. Carts survive — they are
  rows keyed by a separate cookie, not session state.
- **Scaling reads:** `/api/v1/products`, `/categories` and `/collections` send
  `s-maxage` headers and are served by Vercel's CDN. Pages are dynamic because
  the header shows a live bag count; see the trade-off note in ARCHITECTURE.md.
- **Backups:** enable Neon point-in-time restore. `orders`, `order_items` and
  `payments` are the rows you cannot reconstruct.
