import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { defineConfig } from 'drizzle-kit';

let dbUrl = process.env.DATABASE_URL!;

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_SSL === 'TRUE' && !process.env.DATABASE_URL!.includes('ssl') ? `${process.env.DATABASE_URL}?sslmode=require` : process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
