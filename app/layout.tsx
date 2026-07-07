// app/layout.tsx — the app shell: fixed left sidebar + scrollable content
// column with an OCW attribution footer. The whole tree is wrapped in
// <ProgressProvider> so any client component can read/write localStorage
// progress via useProgress().
//
// Dense study-tool styling: light theme, Tailwind only, no hero/animation/emoji.
import type { Metadata } from 'next';
import './globals.css';

import { ProgressProvider } from '@/lib/progress';
import { Sidebar } from '@/components/Sidebar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'ase-prep',
  description: '6.100A Advanced Standing Exam study tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <ProgressProvider>
          <div className="flex min-h-screen">
            {/* Fixed sidebar: its own scroll, constant width. */}
            <aside className="sticky top-0 hidden h-screen w-72 shrink-0 md:block">
              <Sidebar />
            </aside>
            {/* Content column: page fills, footer pinned to the bottom. */}
            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </div>
        </ProgressProvider>
      </body>
    </html>
  );
}
