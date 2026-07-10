// lib/auth.ts — full Auth.js instance (Node runtime): JWT sessions + user upsert.
//
// Extends the edge-safe authConfig with DB-touching callbacks. On sign-in the
// GitHub user is upserted into our `users` table and its uuid is stashed on the
// JWT, then exposed as session.user.id for the server actions.

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { upsertUser } from '@/lib/db/progress-repo';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, profile }) {
      // Google's `sub` is the stable account id; present only on initial sign-in.
      const sub = (profile as { sub?: string } | undefined)?.sub;
      if (sub) {
        const email = (profile as { email?: string | null } | undefined)?.email ?? null;
        token.userId = await upsertUser(sub, email);
      }
      return token;
    },
    session({ session, token }) {
      const userId = token.userId as string | undefined;
      if (userId) session.user.id = userId;
      return session;
    },
  },
});
