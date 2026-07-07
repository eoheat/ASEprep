// middleware.ts — gate every app route behind sign-in (single-user tool).
//
// Uses the edge-safe authConfig. Unauthenticated requests are redirected to
// /login (pages.signIn). Excluded from the gate: the auth API, the /login page
// itself, Next internals, and the public self-hosted assets (Pyodide, Monaco,
// pset data files) — those must load without a session or the worker/editor break.

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico|pyodide|monaco|psets).*)'],
};
