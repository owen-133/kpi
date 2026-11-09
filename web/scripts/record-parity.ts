// Records the legacy portal's normalized answers for every parity spec.
//
//   node web/scripts/record-parity.ts            (run from the repository root)           writes web/src/parity/recorded/*.json
//   node web/scripts/record-parity.ts --check    regenerates in memory-equivalent (a temp dir) and compares with the committed files
//
// It runs the parity specs (`*.parity.spec.ts` and src/parity/parity.spec.ts) with PARITY_RECORD_OUT set and the real legacy
// server (server.js over PGlite) registered as the live oracle; recordedOracle.ts then records each spec's own corpus, so the
// recording and the spec can never disagree about the requests. A spec records its answers twice and refuses a legacy server
// that does not answer the same both times; tie-ordered lists are recorded as sets by the spec's own canonicalize function.
// Exit codes: 0 written / identical · 1 --check found differences (printed per label) · 2 setup problem (no server.js, no PGlite,
// a spec failed while recording, usage).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare, formatDifferences } from '../src/parity/runner.ts';
import { RECORDED_DIR } from '../src/parity/recordedOracle.ts';
import type { Recording } from '../src/parity/recordedOracle.ts';
import { pgliteAvailable } from '../src/parity/credentials.ts';

const WEB = fileURLToPath(new URL('../', import.meta.url));
const REPO = path.resolve(WEB, '..');
const PRELOAD = path.join(WEB, 'scripts', 'parityLiveOracle.ts');

function parityFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) parityFiles(full, out);
    else if (entry.name.endsWith('.parity.spec.ts') || full === path.join(WEB, 'src', 'parity', 'parity.spec.ts')) out.push(full);
  }
  return out.sort();
}

const recordingNames = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);
const read = (file: string): Recording => JSON.parse(readFileSync(file, 'utf8')) as Recording;

function record(outDir: string): number {
  for (const required of ['server.js', 'supabase-store.js']) {
    if (!existsSync(path.join(REPO, required))) {
      console.error(`setup: ${required} is missing; the legacy server is needed to record`);
      return 2;
    }
  }
  if (!pgliteAvailable()) {
    console.error('setup: PGlite is not available; run (cd web && npm ci) or set ORBIT_PGLITE_PATH');
    return 2;
  }
  const files = parityFiles(path.join(WEB, 'src'));
  const run = spawnSync(process.execPath, ['--import', PRELOAD, '--test', '--test-reporter=spec', ...files], {
    cwd: WEB,
    env: { ...process.env, PARITY_RECORD_OUT: outDir },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0) {
    console.error(`setup: the specs failed while recording (exit ${run.status})\n${`${run.stdout}\n${run.stderr}`.split('\n').slice(-60).join('\n')}`);
    return 2;
  }
  return 0;
}

function check(fresh: string): number {
  const committed = recordingNames(RECORDED_DIR);
  const regenerated = recordingNames(fresh);
  const lines: string[] = [];
  for (const name of regenerated.filter((n) => !committed.includes(n))) lines.push(`${name}: not committed`);
  for (const name of committed.filter((n) => !regenerated.includes(n))) lines.push(`${name}: committed but no spec records it any more`);
  for (const name of regenerated.filter((n) => committed.includes(n))) {
    const had = read(path.join(RECORDED_DIR, name));
    const now = read(path.join(fresh, name));
    if (had.corpusSha256 !== now.corpusSha256) lines.push(`${name}: corpusSha256 ${had.corpusSha256.slice(0, 12)} -> ${now.corpusSha256.slice(0, 12)} (the spec's corpus changed)`);
    const diffs = compare(had.results, now.results);
    if (diffs.length > 0) lines.push(`${name}: ${diffs.length} differences (committed = expected, regenerated = got)\n${formatDifferences(diffs)}`);
  }
  if (lines.length > 0) {
    console.error(lines.join('\n'));
    return 1;
  }
  console.log(`record-parity --check: ${committed.length} recordings identical`);
  return 0;
}

function main(argv: string[]): number {
  const flags = argv.filter((a) => a.startsWith('--'));
  if (argv.length !== flags.length || flags.some((f) => f !== '--check')) {
    console.error('usage: node web/scripts/record-parity.ts [--check]');
    return 2;
  }
  if (flags.includes('--check')) {
    const fresh = mkdtempSync(path.join(tmpdir(), 'parity-check-'));
    try {
      const status = record(fresh);
      return status === 0 ? check(fresh) : status;
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  }
  const status = record(RECORDED_DIR);
  if (status === 0) console.log(`record-parity: wrote ${recordingNames(RECORDED_DIR).length} recordings to web/src/parity/recorded`);
  return status;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
