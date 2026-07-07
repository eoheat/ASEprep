// scripts/copy-pyodide.mjs — `npm run vendor-pyodide`
//
// Copies the installed `pyodide` npm dist into public/pyodide so the worker can
// serve Pyodide self-hosted (offline-safe) instead of from the CDN. This removes
// the bad-wifi failure mode Donny flagged.
//
// After running this, flip PYODIDE_INDEX_URL in lib/pyodide-worker.ts to the
// self-hosted path:
//
//     const PYODIDE_INDEX_URL = '/pyodide/';
//
// The CDN stays the default per the fixed stack (CLAUDE.md); this is an opt-in.
//
// Deliberately a plain fs copy — no bundlers, no deps. Provided, not run
// automatically (the copied wasm is large and only needed for offline use).

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const srcDir = join(repoRoot, 'node_modules', 'pyodide');
const destDir = join(repoRoot, 'public', 'pyodide');

async function main() {
  if (!existsSync(srcDir)) {
    console.error(
      `[vendor-pyodide] node_modules/pyodide not found at ${srcDir}. Run npm install first.`,
    );
    process.exit(1);
  }

  await mkdir(destDir, { recursive: true });

  // Copy the whole dist directory. Pyodide's loader resolves pyodide.asm.wasm,
  // python_stdlib.zip, pyodide-lock.json, and package wheels relative to
  // indexURL, so the entire folder must be present.
  await cp(srcDir, destDir, { recursive: true });

  // Report what landed, so the operator can sanity-check the copy.
  const entries = await readdir(destDir);
  let totalBytes = 0;
  for (const name of entries) {
    const info = await stat(join(destDir, name));
    if (info.isFile()) totalBytes += info.size;
  }
  const mb = (totalBytes / (1024 * 1024)).toFixed(1);
  console.log(`[vendor-pyodide] copied ${entries.length} top-level entries to public/pyodide (~${mb} MB of files).`);
  console.log(
    "[vendor-pyodide] Now set PYODIDE_INDEX_URL = '/pyodide/' in lib/pyodide-worker.ts to run self-hosted.",
  );
}

main().catch((err) => {
  console.error('[vendor-pyodide] failed:', err);
  process.exit(1);
});
