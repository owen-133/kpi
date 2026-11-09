#!/usr/bin/env node
// Prints shell `export` lines that enable the environment-gated tests:
//   eval "$(node scripts/env-for-tests.mjs)"
// Nothing is downloaded here. Exit codes:
//   2 PGlite missing (run `cd web && npm ci`)   3 pdfinfo/pdftotext missing
//   4 no Chromium found                          5 real Playwright module not found
import {existsSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {homedir, platform} from 'node:os';
import {delimiter, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const home = homedir();
const quote = (value) => `'${String(value).replaceAll("'", `'\\''`)}'`;
const fail = (code, message) => {
  console.error(`env-for-tests: ${message}`);
  process.exit(code);
};
const onPath = (name) => (process.env.PATH ?? '').split(delimiter).some((dir) => dir && existsSync(join(dir, name)));

// 2. PGlite
const pglite = join(root, 'web/node_modules/@electric-sql/pglite/dist/index.js');
if (!existsSync(pglite)) fail(2, `PGlite not found at web/node_modules/@electric-sql/pglite. Run: (cd web && npm ci)`);

// 3. PDF tools
for (const tool of ['pdfinfo', 'pdftotext']) {
  if (!onPath(tool)) fail(3, `${tool} not on PATH. Install poppler (macOS: brew install poppler, Debian/Ubuntu: apt install poppler-utils)`);
}

// 5. real Playwright module
const realCandidates = [];
if (process.env.ORBIT_PLAYWRIGHT_REAL) realCandidates.push(process.env.ORBIT_PLAYWRIGHT_REAL);
else {
  try {
    const globalRoot = execFileSync('npm', ['root', '-g'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    if (globalRoot) realCandidates.push(join(globalRoot, 'playwright/index.mjs'));
  } catch {}
  realCandidates.push(join(home, '.cache/orbit-playwright/node_modules/playwright/index.mjs'));
}
const playwrightReal = realCandidates.find((path) => existsSync(path));
if (!playwrightReal) {
  fail(5, `Playwright module not found (tried: ${realCandidates.join(', ')}). Install it OUTSIDE the repo, then point at its entry:
  d=$(mktemp -d) && (cd "$d" && npm init -y && npm i playwright && npx playwright install chromium)
  export ORBIT_PLAYWRIGHT_REAL="$d/node_modules/playwright/index.mjs"`);
}

// 4. Chromium
const cacheDir = process.env.PLAYWRIGHT_BROWSERS_PATH
  || (platform() === 'darwin' ? join(home, 'Library/Caches/ms-playwright') : join(home, '.cache/ms-playwright'));
const executables = {
  darwin: {
    shell: (dir) => join(dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    full: (dir) => join(dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  },
  linux: {
    shell: (dir) => join(dir, 'chrome-headless-shell-linux64/chrome-headless-shell'),
    full: (dir) => join(dir, 'chrome-linux64/chrome'),
  },
}[platform()];

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return existsSync(process.env.PLAYWRIGHT_CHROMIUM) ? process.env.PLAYWRIGHT_CHROMIUM : null;
  if (!executables || !existsSync(cacheDir)) return null;
  const revision = (name) => Number(name.split('-').pop());
  const byNewest = (prefix) => readdirSync(cacheDir)
    .filter((name) => name.startsWith(`${prefix}-`) && Number.isInteger(revision(name)))
    .sort((a, b) => revision(b) - revision(a));
  const candidates = [
    ...byNewest('chromium_headless_shell').map((name) => executables.shell(join(cacheDir, name))),
    ...byNewest('chromium').map((name) => executables.full(join(cacheDir, name))),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}
const chromiumPath = findChromium();
if (!chromiumPath) {
  fail(4, `no Chromium found (PLAYWRIGHT_CHROMIUM=${process.env.PLAYWRIGHT_CHROMIUM ?? '<unset>'}, cache ${cacheDir}). Install it OUTSIDE the repo:
  d=$(mktemp -d) && (cd "$d" && npm init -y && npm i playwright && npx playwright install chromium)
  or set PLAYWRIGHT_CHROMIUM to a Chromium executable`);
}

const shim = join(root, 'scripts/playwright-shim.mjs');
console.log([
  `export ORBIT_PGLITE_PATH=${quote(pglite)}`,
  'export ORBIT_PDF_CHECK=1',
  `export ORBIT_PLAYWRIGHT_REAL=${quote(playwrightReal)}`,
  `export ORBIT_PLAYWRIGHT_PATH=${quote(shim)}`,
  `export CHROMIUM_PATH=${quote(chromiumPath)}`,
].join('\n'));
