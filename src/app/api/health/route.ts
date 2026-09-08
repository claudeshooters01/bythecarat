import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Liveness + database reachability, for uptime checks and deploy gates. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
