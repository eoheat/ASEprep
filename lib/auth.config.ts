// lib/auth.config.ts — edge-safe Auth.js config shared with middleware.
//
// No DB imports here: middleware runs on the edge and only needs the JWT + these
// callbacks. The DB-touching jwt/session callbacks live in lib/auth.ts (Node).
//
// Access model: OPEN — anyone with a Google account may sign in and gets their
// own progress (reversed from the earlier single-user allowlist per the owner's
// request). The middleware still requires *a* signed-in user for every app route.

import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authConfig = {
  // Auth.js auto-trusts the host on Vercel; set it explicitly so local `next
  // start` and any host work too. Safe: the deploy host is controlled.
  trustHost: true,
  providers: [Google],
  pages: { signIn: '/login' },
  callbacks: {
    // Middleware gate: signed-in users pass; everyone else → /login (pages.signIn).
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
