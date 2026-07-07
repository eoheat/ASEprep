import type { Config } from 'drizzle-kit';

// drizzle-kit config (M7). `db:generate` produces SQL migrations from
// lib/db/schema.ts (no DB connection needed); `db:migrate` applies them and does
// need DATABASE_URL. Migrations are committed under lib/db/migrations.
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
