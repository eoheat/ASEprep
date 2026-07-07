// app/api/auth/[...nextauth]/route.ts — Auth.js route handlers (GitHub OAuth
// callback, sign-in/out endpoints). Node runtime (the jwt callback touches the DB).
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
