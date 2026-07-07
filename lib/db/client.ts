// lib/db/client.ts — the Neon serverless Drizzle client (M7), created lazily.
//
// Lazy on purpose: importing this module must NOT throw at build time (before env
// is set). Only an actual query needs DATABASE_URL, so `next build` — which
// imports routes that transitively reach here — succeeds without the DB, and the
// value is read at request time on Vercel. Server-only; never import from a
// client component.

import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

let cached: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — see .env.example');
  cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
