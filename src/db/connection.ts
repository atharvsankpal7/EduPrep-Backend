import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema';
import logger from '../utils/logger';

dotenv.config({ path: './.env' });

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/megaproject",
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Database connection function
export async function connectToDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    client.release();
    logger.info('Successfully connected to PostgreSQL database');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database', { error });
    throw new Error('Database connection failed');
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}

// Export pool for advanced usage
export { pool };
