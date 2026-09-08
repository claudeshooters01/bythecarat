/**
 * Development-only Postgres on localhost:5432, backed by PGlite (Postgres
 * compiled to WASM, running in this process). Lets the app, migrations and
 * seed run end-to-end on a machine with no Postgres installed.
 *
 * PGlite serves one connection at a time, so pair it with DATABASE_POOL_MAX=1.
 * It is not a production substitute — Neon is.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const db = await PGlite.create({ dataDir: process.env.PGLITE_DIR ?? "./data/pglite" });
const server = new PGLiteSocketServer({ db, port: 5432, host: "127.0.0.1" });

await server.start();
console.log("PGlite listening on 127.0.0.1:5432");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
