// components/NoticeBox.tsx — a small, muted callout used for M2 placeholders
// ("real content lands in M4/M5") and other informational notes. Server-safe.

import type { ReactNode } from 'react';

export function NoticeBox({
  title,
  children,
  tone = 'info',
}: {
  title?: string;
  children: ReactNode;
  tone?: 'info' | 'placeholder';
}) {
  const toneClass =
    tone === 'placeholder'
      ? 'border-dashed border-neutral-300 bg-neutral-50 text-neutral-600'
      : 'border-blue-200 bg-blue-50 text-blue-900';
  return (
    <div className={`rounded border px-4 py-3 text-sm ${toneClass}`}>
      {title && <p className="font-medium">{title}</p>}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}

export default NoticeBox;
