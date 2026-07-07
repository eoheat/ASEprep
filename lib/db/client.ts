// lib/db/client.ts — the Neon serverless Drizzle client (M7).
//
// Uses the HTTP driver, which is the right fit for Vercel serverless functions
// (one-shot queries, no connection pooling to manage). Server-only — never
// import from a client component.

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — see .env.example');
}

export const db = drizzle(neon(connectionString), { schema });
export { schema };
