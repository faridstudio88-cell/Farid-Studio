import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  firebaseUid: string,
  email: string | null,
  displayName: string | null
) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));
    if (existing.length > 0) {
      if (
        (email && existing[0].email !== email) ||
        (displayName && existing[0].displayName !== displayName)
      ) {
        const [updated] = await db
          .update(users)
          .set({
            email: email || existing[0].email,
            displayName: displayName || existing[0].displayName,
            updatedAt: new Date(),
          })
          .where(eq(users.firebaseUid, firebaseUid))
          .returning();
        return updated;
      }
      return existing[0];
    }

    const [created] = await db
      .insert(users)
      .values({
        firebaseUid,
        email,
        displayName,
        role: 'admin',
      })
      .returning();
    return created;
  } catch (err) {
    console.error('Error syncing user record:', err);
    throw err;
  }
}
