import { db } from '../connection';
import { constants, Constant } from '../schema';
import { eq } from 'drizzle-orm';

export interface ConstantsValue {
  MAX_CONCURRENT_SESSION_COUNT?: number;
}

export async function getConstant(key: string): Promise<Constant | undefined> {
  const [row] = await db.select().from(constants).where(eq(constants.key, key));
  return row;
}

export async function upsertConstant(key: string, value: ConstantsValue): Promise<Constant> {
  const existing = await getConstant(key);
  if (existing) {
    const [updated] = await db
      .update(constants)
      .set({ value, updatedAt: new Date() })
      .where(eq(constants.key, key))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(constants)
    .values({ key, value })
    .returning();
  return created;
}

export async function getMaxConcurrentSessions(defaultValue = 1): Promise<number> {
  const constant = await getConstant('MAX_CONCURRENT_SESSION_COUNT');
  const value = (constant?.value ?? {}) as ConstantsValue;
  const limit = value.MAX_CONCURRENT_SESSION_COUNT;
  return typeof limit === 'number' && limit > 0 ? limit : defaultValue;
}
