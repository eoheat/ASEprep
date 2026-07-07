// app/settings/page.tsx — export/import progress + exam default knobs.
//
// All the interactivity lives in <SettingsPanel> (client). This page is just the
// header and container.

import { PageHeader } from '@/components/PageHeader';
import { SettingsPanel } from '@/components/SettingsPanel';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        trail={[{ label: 'Settings' }]}
        title="Settings"
        description="Back up or restore your progress, and tune the exam timer and pass threshold. All state is local to this browser."
      />
      <div className="max-w-2xl px-6 py-6">
        <SettingsPanel />
      </div>
    </>
  );
}
