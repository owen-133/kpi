#!/usr/bin/env node
// Shows what a change touches, from `git diff --name-only <base>` plus untracked new files:
//   - SSOT requirements whose evidence lines sit in a changed file
//   - golden labels that could be affected (a possibility, not a measurement)
//   - tests that carry the id of an affected requirement (`R-NNN` in test/ and web/src/)
//   - the pinned graft's `blast` output (first 40 lines) when graft is installed
//
// Usage: node scripts/impact.mjs [--base <ref>] [--root <dir>]     (default base: origin/main)
// Exit: 0 always, 2 usage error (bad flag, unknown base ref, root without git).
import {spawnSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const USAGE = 'usage: node scripts/impact.mjs [--base <ref>] [--root <dir>]';
const REQUIREMENTS = 'docs/ssot/requirements.md';
const GOLDEN = 'test/golden/legacy-portal.json';
const GRAFT_BIN = 'tools/graft/node_modules/.bin/graft';
const BLAST_LINES = 40;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = {base: 'origin/main', root: resolve(dirname(fileURLToPath(import.meta.url)), '..')};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg !== '--base' && arg !== '--root') throw new UsageError(`unknown argument: ${arg}`);
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new UsageError(`${arg} needs a value`);
    opts[arg.slice(2)] = arg === '--root' ? resolve(argv[++i]) : argv[++i];
  }
  return opts;
}

const git = (root, args) => spawnSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});

// `### R-001 title` blocks with their `evidence:` bullets (`path:N` or `path:N-M`).
export function parseRequirements(text) {
  const reqs = [];
  let current = null;
  let inEvidence = false;
  for (const line of text.split('\n')) {
    const heading = line.match(/^### (R-\d{3})\s+(.*)$/);
    if (heading) {
      current = {id: heading[1], title: heading[2].trim(), evidence: []};
      reqs.push(current);
      inEvidence = false;
    } else if (/^#{1,3} /.test(line)) {
      current = null;
    } else if (current) {
      if (/^evidence:\s*$/.test(line)) inEvidence = true;
      else if (/^[a-z-]+:/.test(line)) inEvidence = false;
      else if (inEvidence) {
        const item = line.match(/^- `?([^\s:`]+):(\d+)(?:-(\d+))?`?\s*$/);
        if (item) current.evidence.push({file: item[1], from: Number(item[2]), to: Number(item[3] ?? item[2])});
        else if (!/^- /.test(line)) inEvidence = false;
      }
    }
  }
  return reqs;
}

function walk(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, found);
    else if (/\.(m?[jt]sx?|cjs)$/.test(entry.name)) found.push(path);
  }
  return found;
}

// requirement id -> ["file:firstLine (xN)", ...] for every file in test/ and web/src/ that mentions `R-NNN`.
function testMentions(root) {
  const found = new Map();
  for (const file of [...walk(join(root, 'test')), ...walk(join(root, 'web/src'))]) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      for (const id of new Set(line.match(/\bR-\d{3}\b/g) ?? [])) {
        if (!found.has(id)) found.set(id, new Map());
        const perFile = found.get(id);
        const name = relative(root, file);
        perFile.set(name, perFile.has(name) ? {...perFile.get(name), count: perFile.get(name).count + 1} : {line: index + 1, count: 1});
      }
    });
  }
  return new Map([...found].map(([id, perFile]) => [id, [...perFile].map(([name, v]) => `${name}:${v.line}${v.count > 1 ? ` (x${v.count})` : ''}`)]));
}

function goldenLabels(root, changed) {
  const path = join(root, GOLDEN);
  if (!existsSync(path)) return [`(${GOLDEN} not found)`];
  const golden = JSON.parse(readFileSync(path, 'utf8'));
  const entries = Object.entries(golden).flatMap(([group, labels]) => Object.entries(labels).map(([label, v]) => ({key: `${group}/${label}`, label, request: String(v.request ?? '')})));
  const lines = [];
  if (changed.some((f) => f.startsWith('public/'))) {
    lines.push(`possible (public/ changed): ${entries.filter((e) => e.label.startsWith('static-')).map((e) => e.key).join(', ') || 'none'}`);
  }
  if (changed.includes('server.js')) {
    const api = entries.filter((e) => /^\S+ \/(api|health)(\/|\?|$)/.test(e.request));
    lines.push(`possible (server.js changed): ${api.length} API labels: ${api.map((e) => e.key).join(', ')}`);
  }
  return lines;
}

function section(title, lines) {
  return `== ${title} ==\n${lines.length ? lines.join('\n') : '(none)'}\n`;
}

export function main(argv, {out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s)} = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
    if (git(opts.root, ['rev-parse', '--git-dir']).status !== 0) throw new UsageError(`not a git repository: ${opts.root}`);
    if (git(opts.root, ['rev-parse', '--verify', '--quiet', `${opts.base}^{commit}`]).status !== 0) throw new UsageError(`unknown base ref: ${opts.base}`);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    err(`impact: ${error.message}\n${USAGE}\n`);
    return 2;
  }
  const diff = git(opts.root, ['diff', '--name-only', opts.base]);
  if (diff.status !== 0) {
    err(`impact: git diff failed: ${diff.stderr}\n`);
    return 2;
  }
  // New files not yet added are part of the change too; `git diff` alone does not list them.
  const untracked = git(opts.root, ['ls-files', '--others', '--exclude-standard']).stdout ?? '';
  const changed = [...new Set([...diff.stdout.split('\n'), ...untracked.split('\n')].filter(Boolean))];
  out(`impact against ${opts.base}: ${changed.length} changed file(s)\n\n`);
  out(section('changed files', changed));

  const reqPath = join(opts.root, REQUIREMENTS);
  const reqs = existsSync(reqPath) ? parseRequirements(readFileSync(reqPath, 'utf8')) : [];
  const hit = reqs.map((r) => ({...r, files: [...new Set(r.evidence.filter((e) => changed.includes(e.file)).map((e) => e.file))]})).filter((r) => r.files.length);
  out(`\n${section(`SSOT requirements with evidence in changed files (${REQUIREMENTS})`, existsSync(reqPath) ? hit.map((r) => `${r.id} ${r.title}: ${r.files.join(', ')}`) : [`(${REQUIREMENTS} not found)`])}`);

  out(`\n${section('golden labels', goldenLabels(opts.root, changed))}`);

  const mentions = testMentions(opts.root);
  out(`\n${section('tests tagged with those requirement ids', hit.map((r) => `${r.id}: ${(mentions.get(r.id) ?? ['(no test mentions this id)']).join(', ')}`))}`);

  if (existsSync(join(opts.root, GRAFT_BIN))) {
    const r = spawnSync('sh', ['scripts/graft', 'blast', '--base', opts.base], {cwd: opts.root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
    const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\n+$/, '').split('\n').filter((l, i, a) => l || a.length > 1);
    out(`\n== graft blast (first ${BLAST_LINES} lines${r.status === 0 ? '' : `, graft exit ${r.status}`}) ==\n${lines.slice(0, BLAST_LINES).join('\n')}\n`);
  } else {
    out('\ngraft: not installed (run sh scripts/setup-graft.sh)\n');
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
