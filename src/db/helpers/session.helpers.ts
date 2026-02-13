import { db } from '../connection';
import { sessions, users, Session, NewSession } from '../schema';
import { and, eq, isNull, gt, or, sql } from 'drizzle-orm';

export interface SessionWithUser {
  sessionId: string;
  userId: number;
  email: string;
  fullName: string;
  role: 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export async function createSession(data: NewSession): Promise<Session> {
  const [session] = await db.insert(sessions).values(data).returning();
  return session;
}

export async function getSessionById(id: string): Promise<Session | undefined> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  return session;
}

export async function getActiveSessionWithUser(
  id: string
): Promise<SessionWithUser | undefined> {
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, id),
        isNull(sessions.revokedAt),
        or(isNull(sessions.expiresAt), gt(sessions.expiresAt, now))
      )
    );

  return row as SessionWithUser | undefined;
}

export async function touchSession(id: string): Promise<void> {
  await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
}

export async function revokeSession(id: string): Promise<void> {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id));
}

export async function countActiveSessionsByUser(userId: number): Promise<number> {
  const now = new Date();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        or(isNull(sessions.expiresAt), gt(sessions.expiresAt, now))
      )
    );
  const count = row?.count ?? 0;
  return typeof count === 'number' ? count : Number(count);
}
