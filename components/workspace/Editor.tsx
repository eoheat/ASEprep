'use client';

// components/workspace/Editor.tsx
//
// Thin wrapper around Monaco. Loaded via next/dynamic({ ssr: false }) from the
// Workspace so it never renders on the server (Monaco needs the DOM / web
// workers). Kept deliberately small: value in, onChange out, Python mode, plus a
// Cmd/Ctrl+Enter command wired to the parent's "run tests" action.

import MonacoEditor, { loader } from '@monaco-editor/react';

// Self-host Monaco from /public/monaco/vs (vendored at build by
// scripts/vendor-assets.mjs) so the deployed app makes zero CDN requests and
// works offline. Runs once when this client module loads, before the editor mounts.
loader.config({ paths: { vs: '/monaco/vs' } });

export type EditorProps = {
  value: string;
  onChange: (next: string) => void;
  /** Invoked on Cmd/Ctrl+Enter — the parent runs tests. */
  onRunTests?: () => void;
};

export default function Editor({ value, onChange, onRunTests }: EditorProps) {
  return (
    <MonacoEditor
      height="360px"
      defaultLanguage="python"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={(editor, monaco) => {
        // Cmd/Ctrl+Enter runs tests (PLAN §7 / M3 acceptance).
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          onRunTests?.();
        });
      }}
      options={{
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        insertSpaces: true,
        automaticLayout: true,
        renderWhitespace: 'selection',
      }}
    />
  );
}
