// Leonida Trophy Guide — entrypoint for make.fun bounty gta6-trophy-guide-01.
// The guide itself is plain static files under app/ (index.html, app.js,
// style.css and data/trophies.json): a browser opens app/index.html and the
// whole thing works with the network off — no fetches, no fonts, no CDN.
// This program only hands the entry in: it copies app/ and screenshots/
// next to the dossier the judge reads, using the vendored make.fun
// library (vendor/makefun-frontend.ts, left untouched). The scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and try the guide with `node serve.ts`, then http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(sourceDir, targetDir) {
  if (existsSync(sourceDir)) {
    cpSync(sourceDir, targetDir, { recursive: true });
  }
}

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

  // Caps from the scorer's reference gate: at most 4 screenshots, each
  // under 256 KiB; app/ at most 993 files and directories and 48 MiB;
  // text budget 163840 bytes. Only text_max_bytes shapes the bytes.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
