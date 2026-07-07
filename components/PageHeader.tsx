// components/PageHeader.tsx — the top of every content page: breadcrumb bar,
// page title, optional description and right-aligned actions. Server component.

import type { ReactNode } from 'react';

import { Breadcrumb, type Crumb } from '@/components/Breadcrumb';

export function PageHeader({
  trail,
  title,
  description,
  actions,
}: {
  trail: Crumb[];
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-4">
      <Breadcrumb trail={trail} />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-neutral-600">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
