// scripts/vendor-assets.mjs — vendor Pyodide + Monaco into /public for a
// CDN-free, offline-capable deploy (M6). Runs before dev/build; idempotent, so a
// repeat run whose sentinel already exists is skipped and near-instant.
//
// Both destinations are gitignored and regenerated at build time (locally and on
// Vercel), so the ~43 MB of vendored assets never enter the repo.

import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const jobs = [
  {
    name: 'pyodide',
    src: join(root, 'node_modules', 'pyodide'),
    dest: join(root, 'public', 'pyodide'),
    sentinel: join(root, 'public', 'pyodide', 'pyodide.mjs'),
  },
  {
    name: 'monaco',
    src: join(root, 'node_modules', 'monaco-editor', 'min', 'vs'),
    dest: join(root, 'public', 'monaco', 'vs'),
    sentinel: join(root, 'public', 'monaco', 'vs', 'loader.js'),
  },
];

for (const j of jobs) {
  if (existsSync(j.sentinel)) {
    console.log(`[vendor] ${j.name}: already present, skipping.`);
    continue;
  }
  if (!existsSync(j.src)) {
    console.error(`[vendor] ${j.name}: source missing at ${j.src} — run "npm install" first.`);
    process.exit(1);
  }
  await mkdir(dirname(j.dest), { recursive: true });
  await cp(j.src, j.dest, { recursive: true });
  console.log(`[vendor] ${j.name}: copied -> ${j.dest.replace(root + '/', '')}`);
}
console.log('[vendor] done.');
