import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { hashPassword, verifyPassword, type SessionUser } from "@/lib/auth";
import { newId } from "@/lib/ids";

/** Compared against when there is no real hash, so failures take the same time. */
const DUMMY_HASH = "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";

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
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  // A Google-only account has no password to check. Fall through to the same
  // generic failure rather than saying so — "this email uses Google" would
  // confirm the account exists to anyone who asked.
  if (!row.passwordHash) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) return null;

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/**
 * Resolve a Google identity to an account, creating one if needed.
 *
 * Matching is by Google's `sub` first, because it is stable — a user can
 * change their Gmail address and must stay the same customer. Falling back to
 * email links a Google login to an existing password account, which is only
 * safe because the caller has already checked Google marked the address
 * verified; without that check, anyone could claim an account by creating a
 * Google profile with someone else's address.
 */
export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
}): Promise<SessionUser> {
  const [existing] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.googleId, profile.googleId))
    .limit(1);

  if (existing) return existing;

  // Either a brand new customer, or someone who signed up with a password and
  // is now using Google — the conflict clause links the two.
  const [row] = await db
    .insert(users)
    .values({
      id: newId(),
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      passwordHash: null,
    })
    .onConflictDoUpdate({ target: users.email, set: { googleId: profile.googleId } })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  return row;
}
