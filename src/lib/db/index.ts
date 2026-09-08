import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Singleton across Next.js hot reloads and per serverless instance. This file
// is the single seam for the database driver: node-postgres speaks to Neon's
// pooled endpoint in production and to any plain Postgres in development —
// services and routes never know the difference.
const globalForDb = globalThis as unknown as {
  db?: NodePgDatabase<typeof schema>;
};

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set to a Postgres connection string");
  }
  const pool = new Pool({
    connectionString: url,
    // Serverless instances each hold a small pool; Neon's PgBouncer endpoint
    // (-pooler host) multiplexes them server-side. Tunable because the right
    // number is a property of the deployment, not of the code: Neon's free
    // tier wants a smaller ceiling than a dedicated Postgres does.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
  });
  return drizzle(pool, { schema });
}

export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export * from "./schema";
