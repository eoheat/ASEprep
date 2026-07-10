// types/next-auth.d.ts — augment Auth.js types with our internal user id (the
// Postgres uuid) and the GitHub id, so session.user.id / token.userId are typed.
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}
