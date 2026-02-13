import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../connection';
import { users, User, NewUser } from '../schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate access token
export function generateAccessToken(user: User): string {
  const secret = process.env.ACCESS_TOKEN_SECRET as jwt.Secret;
  const expiresIn = (process.env.ACCESS_TOKEN_EXPIRY || '15m') as jwt.SignOptions['expiresIn'];
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}

// Generate refresh token
export function generateRefreshToken(user: User): string {
  const secret = process.env.REFRESH_TOKEN_SECRET as jwt.Secret;
  const expiresIn = (process.env.REFRESH_TOKEN_EXPIRY || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(
    { id: user.id },
    secret,
    { expiresIn }
  );
}

// Generate both tokens and update user
export async function generateTokensForUser(
  userId: number
): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new Error('User not found');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update refresh token in database
  await db.update(users).set({ refreshToken }).where(eq(users.id, userId));

  return { accessToken, refreshToken, user };
}

// Verify access token
export function verifyAccessToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as jwt.JwtPayload;
  } catch {
    return null;
  }
}
