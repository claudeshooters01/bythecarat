import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";

/** Current session, or null. Used by client islands that need the user id. */
export const GET = handle(async () => ok(await getSession()));
