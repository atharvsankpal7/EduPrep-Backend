import { db } from '../connection';
import { constants, Constant, sessions } from '../schema';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';

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

export async function haveMaxSessionReached(userId: number): Promise<boolean> {
  const now = new Date();

  const [result] = await db
    .select({
      activeCount: sql<number>`count(*)`,
      maxSessions: sql<number>`COALESCE(
        (SELECT (value->>'MAX_CONCURRENT_SESSION_COUNT')::int 
         FROM ${constants} 
         WHERE ${constants.key} = 'MAX_CONCURRENT_SESSION_COUNT'),
        1
      )`,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        or(isNull(sessions.expiresAt), gt(sessions.expiresAt, now))
      )
    );

  return (result?.activeCount ?? 0) >= (result?.maxSessions ?? 1);
}
