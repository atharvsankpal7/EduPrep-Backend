import { db } from '../connection';
import { users, User, NewUser } from '../schema';
import { eq, sql, and, ilike, gte, lte, desc } from 'drizzle-orm';
import { hashPassword } from './auth.helpers';

export type UserWithoutPassword = Omit<User, 'password'>;
export type PublicUser = Omit<User, 'password' | 'refreshToken'>;

export interface StudentFilters {
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// Create user
export async function createUser(data: NewUser): Promise<User> {
  const hashedPassword = await hashPassword(data.password);

  const [user] = await db
    .insert(users)
    .values({ ...data, password: hashedPassword })
    .returning();

  return user;
}

// Create user with pre-hashed password (for migrations)
export async function createUserRaw(data: NewUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ ...data })
    .returning();

  return user;
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user;
}

// Find user by ID
export async function findUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

// Find user by ID without password
export async function findUserByIdSecure(id: number): Promise<UserWithoutPassword | undefined> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      refreshToken: users.refreshToken,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  return user;
}

// Find user by ID without password or refresh token
export async function findUserByIdPublic(id: number): Promise<PublicUser | undefined> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  return user;
}

// Update user
export async function updateUser(id: number, data: Partial<NewUser>): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return user;
}

// Clear refresh token (logout)
export async function clearUserRefreshToken(id: number): Promise<void> {
  await db.update(users).set({ refreshToken: null }).where(eq(users.id, id));
}

// Check if user is admin
export async function isUserAdmin(id: number): Promise<boolean> {
  const user = await findUserById(id);
  return user?.role === 'admin';
}

// Find any admin user
export async function findAnyAdmin(): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  return user;
}

function buildStudentFilter(filters: StudentFilters) {
  const conditions = [eq(users.role, 'student')];

  if (filters.search) {
    conditions.push(ilike(users.fullName, `%${filters.search}%`));
  }

  if (filters.startDate) {
    conditions.push(gte(users.createdAt, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(users.createdAt, filters.endDate));
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

// Count students with filters
export async function countStudents(filters: StudentFilters): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(buildStudentFilter(filters));

  const count = result?.count ?? 0;
  return typeof count === 'number' ? count : Number(count);
}

// List students with filters and pagination
export async function listStudents(
  filters: StudentFilters,
  limit: number,
  offset: number
): Promise<PublicUser[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(buildStudentFilter(filters))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

// Find student by ID (public fields only)
export async function findStudentById(id: number): Promise<PublicUser | undefined> {
  const [student] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'student')));

  return student;
}
