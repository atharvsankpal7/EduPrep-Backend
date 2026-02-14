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

type PoolClientLike = {
  on: (event: 'error', listener: (error: Error) => void) => void;
};

pool.on('error', (error: Error) => {
  logger.error('Unexpected PostgreSQL pool error', {
    message: error.message,
    stack: error.stack,
  });
});

pool.on('connect', (client: PoolClientLike) => {
  client.on('error', (error: Error) => {
    logger.error('PostgreSQL client error', {
      message: error.message,
      stack: error.stack,
    });
  });
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
    const dbError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to connect to PostgreSQL database', {
      message: dbError.message,
      stack: dbError.stack,
    });
    throw dbError;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}

// Export pool for advanced usage
export { pool };
