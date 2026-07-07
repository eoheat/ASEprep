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
      const gid = (profile as { id?: number | string } | undefined)?.id;
      if (gid != null) {
        const githubId = String(gid);
        const email = (profile as { email?: string | null } | undefined)?.email ?? null;
        token.githubId = githubId;
        token.userId = await upsertUser(githubId, email);
      }
      return token;
    },
    session({ session, token }) {
      const userId = token.userId as string | undefined;
      const githubId = token.githubId as string | undefined;
      if (userId) session.user.id = userId;
      if (githubId) session.user.githubId = githubId;
      return session;
    },
  },
});
