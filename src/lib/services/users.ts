import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { hashPassword, verifyPassword, type SessionUser } from "@/lib/auth";
import { newId } from "@/lib/ids";

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<SessionUser | null> {
  const passwordHash = await hashPassword(input.password);

  // Let the unique index arbitrate rather than SELECT-then-INSERT, which
  // races. onConflictDoNothing + empty returning === email already taken.
  const [row] = await db
    .insert(users)
    .values({ id: newId(), email: input.email, passwordHash, name: input.name })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  return row ?? null;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!row) {
    // Spend the same time as a real comparison so response latency does not
    // reveal whether an account exists.
    await verifyPassword(password, "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return null;
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) return null;

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
