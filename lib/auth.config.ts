// lib/auth.config.ts — edge-safe Auth.js config shared with middleware.
//
// No DB imports here: middleware runs on the edge and only needs the JWT + these
// callbacks. The DB-touching jwt/session callbacks live in lib/auth.ts (Node).

import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const authConfig = {
  // Auth.js auto-trusts the host on Vercel; set it explicitly so local `next
  // start` and any host work too. Safe: the deploy host is controlled.
  trustHost: true,
  providers: [GitHub],
  pages: { signIn: '/login' },
  callbacks: {
    // Single-user allowlist: only the one configured GitHub id may sign in.
    // Anyone else is rejected here, before any session is created.
    signIn({ profile }) {
      const gid = (profile as { id?: number | string } | undefined)?.id;
      const id = gid != null ? String(gid) : undefined;
      const allowed = process.env.ALLOWED_GITHUB_ID;
      return Boolean(allowed) && id === allowed;
    },
    // Middleware gate: signed-in users pass; everyone else → /login (pages.signIn).
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
