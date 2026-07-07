// app/login/page.tsx — the single-button sign-in page (M7).
//
// A server-action form calls Auth.js signIn('github'). Matches the app's plain
// study-tool look; no new design system. Excluded from the middleware gate.

import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">ase-prep</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          6.100A ASE study tool. Sign in with GitHub to sync your progress across devices.
        </p>
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/' });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
