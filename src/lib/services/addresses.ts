import { and, desc, eq } from "drizzle-orm";
import { db, addresses } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { z } from "zod";
import type { addressSchema } from "@/lib/validators";

export async function listAddresses(userId: string) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function createAddress(
  userId: string,
  input: z.infer<typeof addressSchema>,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .limit(1);

    const [row] = await tx
      .insert(addresses)
      .values({
        id: newId(),
        userId,
        ...input,
        line2: input.line2 ?? null,
        // First address saved becomes the default with no extra ceremony.
        isDefault: !existing,
      })
      .returning();
    return row;
  });
}

export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  const rows = await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });
  return rows.length > 0;
}
