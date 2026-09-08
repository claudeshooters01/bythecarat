/**
 * Canonical site origin, resilient to how platforms set env vars:
 * SITE_URL wins when non-empty; otherwise fall back to the deployment's own
 * URL on Vercel (VERCEL_URL is bare-host, no scheme), else localhost. `||`
 * (not ??) so an empty-string env var — Vercel's default for a blank field —
 * falls through instead of crashing `new URL("")` at build time.
 */
export const siteUrl =
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";
