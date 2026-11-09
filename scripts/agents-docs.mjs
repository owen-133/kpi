#!/usr/bin/env node
// Checks the agent instruction documents: size, duplication, Claude stubs, journal prose.
//
// Usage: node scripts/agents-docs.mjs [--root <dir>] [--report]
//   --root    repo root to check (default: the repo containing this script)
//   --report  also print a table `dir | files | bytes`, one row per directory that has an AGENTS.md
// Exit: 0 ok, 1 violations (one `file:line rule message` line each), 2 usage or setup error
//       (a missing root AGENTS.md is a setup error: the check must never pass on nothing).
//
// Discovery: every AGENTS.md under the root except node_modules, .git, graft, scratch, .next,
// web/ssot-fixtures and web/arch-fixtures. A directory's chain is its own AGENTS.md plus those of
// its ancestors up to the root (Codex concatenates the chain under project_doc_max_bytes).
// Rules:
//   S1 size      the byte sum of a chain stays under 32768 (32 KiB).
//   S2 duplicate a normalized line appears in two files of one chain, or in a chain file and docs/architecture.md.
//   S3 stub      every directory with an AGENTS.md has a CLAUDE.md that is exactly `@AGENTS.md\n`.
//   J1..J4       journal markers in rule documents (present-tense facts only; history lives in CHANGELOG.md):
//                J1 dated heading, J2 "before ... now" on one line, J3 a line ending in a past-tense verb,
//                J4 a dated bullet. Fenced code, inline code spans and requirement accept lines are ignored.
// Scanned for J*: chain AGENTS.md and CLAUDE.md, docs/**/*.md (docs/ssot/requirements.md only above its
// first `### R-` heading), .codex/**/*.toml, DEPLOY.md. CHANGELOG.md is exempt.
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SIZE_LIMIT = 32768;
export const STUB = '@AGENTS.md\n';
const USAGE = 'usage: node scripts/agents-docs.mjs [--root <dir>] [--report]';
const SKIP_DIRS = new Set(['node_modules', '.git', 'graft', 'scratch', '.next']);
const SKIP_PATHS = new Set(['web/ssot-fixtures', 'web/arch-fixtures']);
const MIN_DUP_BYTES = 30;
const REQ_FILE = 'docs/ssot/requirements.md';
const ARCH_FILE = 'docs/architecture.md';

class SetupError extends Error {}

const posix = (root, path) => relative(root, path).split(sep).join('/');
const isFence = (line) => /^\s*(```|~~~)/.test(line);

function walk(root, dir, visit) {
  if (!existsSync(dir)) return; // docs/ and .codex/ are optional; the root itself was checked before
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_PATHS.has(posix(root, path))) continue;
      walk(root, path, visit);
    } else if (entry.isFile()) visit(path);
  }
}

// Lines of a markdown file outside fenced code blocks: [{n, text}] with 1-based n.
export function proseLines(text, {fences = true} = {}) {
  const out = [];
  let inFence = false;
  text.split('\n').forEach((raw, i) => {
    if (fences && isFence(raw)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) out.push({n: i + 1, text: raw.replace(/\r$/, '')});
  });
  return out;
}

export function normalizeLine(text) {
  const t = text.trim();
  if (t.startsWith('#') || /^\|?[\s:|-]*-{3,}[\s:|-]*$/.test(t)) return null;
  const n = t.replace(/^(- |\| )/, '').trim();
  return Buffer.byteLength(n) < MIN_DUP_BYTES ? null : n;
}

const ACCEPT = /^\s*(accept:|-?\s*(Given|When|Then)\b)/;
const JOURNAL = [
  ['J1', /^#{1,6} .*20\d\d[-./]\d\d/, 'dated heading'],
  ['J2', /(기존에는|이전에는|예전에는|원래는|previously).*(이번에|바꿨|바뀌었|변경했|고쳤|now\b)/, 'before/now narrative on one line'],
  ['J3', /(했|됐|었|였|웠)다\.?$/, 'line ends in a past-tense verb'],
  ['J4', /^\s*[-*]\s*20\d\d-\d\d-\d\d/, 'dated bullet'],
];

// Journal findings of one document: [{line, rule, message}].
export function journalFindings(text, {headerOnly = false} = {}) {
  const found = [];
  let lines = proseLines(text);
  if (headerOnly) {
    const cut = lines.findIndex((l) => /^### R-/.test(l.text));
    if (cut >= 0) lines = lines.slice(0, cut);
  }
  for (const {n, text: raw} of lines) {
    if (ACCEPT.test(raw)) continue;
    const line = raw.replace(/`[^`]*`/g, '').trimEnd();
    for (const [rule, re, message] of JOURNAL) if (re.test(line)) found.push({line: n, rule, message});
  }
  return found;
}

export function check(root) {
  const rootAgents = join(root, 'AGENTS.md');
  if (!existsSync(rootAgents)) throw new SetupError(`${rootAgents} not found: the root AGENTS.md is required`);
  const agents = []; // directories (absolute) that have an AGENTS.md
  walk(root, root, (path) => {
    if (basename(path) === 'AGENTS.md') agents.push(dirname(path));
  });
  agents.sort();
  const violations = [];
  const seen = new Set();
  const add = (file, line, rule, message) => {
    const key = `${file}:${line} ${rule} ${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push({file, line, rule, message});
  };
  const read = (path) => readFileSync(path, 'utf8');
  const chainOf = (dir) => agents.filter((d) => dir === d || dir.startsWith(d + sep)).sort((a, b) => a.length - b.length);
  const rows = [];
  const arch = existsSync(join(root, ARCH_FILE)) ? new Set(proseLines(read(join(root, ARCH_FILE))).map((l) => normalizeLine(l.text)).filter(Boolean)) : new Set();
  for (const dir of agents) {
    const chain = chainOf(dir);
    const files = chain.map((d) => join(d, 'AGENTS.md'));
    const bytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
    rows.push({dir: posix(root, dir) || '.', files: files.length, bytes});
    if (bytes >= SIZE_LIMIT) add(posix(root, join(dir, 'AGENTS.md')), 1, 'S1', `chain is ${bytes} bytes (limit ${SIZE_LIMIT - 1}): ${files.map((f) => posix(root, f)).join(' + ')}`);
    const owners = new Map(); // normalized line -> first {file, line}
    for (const file of files) {
      const rel = posix(root, file);
      for (const {n, text} of proseLines(read(file))) {
        const norm = normalizeLine(text);
        if (!norm) continue;
        if (arch.has(norm)) add(rel, n, 'S2', `line also in ${ARCH_FILE}`);
        const first = owners.get(norm);
        if (first && first.file !== rel) add(rel, n, 'S2', `line also in ${first.file}:${first.line}`);
        else if (!first) owners.set(norm, {file: rel, line: n});
      }
    }
  }
  const scanned = new Set();
  for (const dir of agents) {
    const stub = join(dir, 'CLAUDE.md');
    const rel = posix(root, stub);
    if (!existsSync(stub)) add(rel, 1, 'S3', 'CLAUDE.md missing: it must contain exactly `@AGENTS.md`');
    else {
      if (read(stub) !== STUB) add(rel, 1, 'S3', 'CLAUDE.md must be exactly `@AGENTS.md` + newline');
      scanned.add(stub);
    }
    scanned.add(join(dir, 'AGENTS.md'));
  }
  const addJournal = (path, opts) => {
    const rel = posix(root, path);
    for (const f of journalFindings(read(path), opts)) add(rel, f.line, f.rule, f.message);
  };
  for (const path of scanned) addJournal(path);
  walk(root, join(root, 'docs'), (path) => {
    if (!path.endsWith('.md') || basename(path) === 'CHANGELOG.md') return;
    addJournal(path, {headerOnly: posix(root, path) === REQ_FILE});
  });
  walk(root, join(root, '.codex'), (path) => {
    if (path.endsWith('.toml')) addJournal(path);
  });
  if (existsSync(join(root, 'DEPLOY.md'))) addJournal(join(root, 'DEPLOY.md'));
  return {violations, rows};
}

export function formatReport(rows) {
  const cells = [['dir', 'files', 'bytes'], ...rows.map((r) => [r.dir, String(r.files), String(r.bytes)])];
  const w = [0, 1, 2].map((c) => Math.max(...cells.map((r) => r[c].length)));
  const line = (r) => `${r[0].padEnd(w[0])} | ${r[1].padStart(w[1])} | ${r[2].padStart(w[2])}`;
  return [line(cells[0]), w.map((n) => '-'.repeat(n)).join('-+-'), ...cells.slice(1).map(line)].join('\n');
}

export function main(argv, {out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s)} = {}) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let report = false;
  try {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--report') report = true;
      else if (argv[i] === '--root') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new SetupError('--root needs a value');
        root = resolve(argv[++i]);
      } else throw new SetupError(`unknown argument: ${argv[i]}`);
    }
    if (!existsSync(root) || !statSync(root).isDirectory()) throw new SetupError(`--root is not a directory: ${root}`);
    const {violations, rows} = check(root);
    if (report) out(`${formatReport(rows)}\n`);
    for (const v of violations) out(`${v.file}:${v.line} ${v.rule} ${v.message}\n`);
    out(violations.length ? `agents-docs: ${violations.length} violation(s)\n` : `agents-docs: ok (${rows.length} AGENTS.md director${rows.length === 1 ? 'y' : 'ies'}, largest chain ${Math.max(...rows.map((r) => r.bytes))} bytes)\n`);
    return violations.length ? 1 : 0;
  } catch (error) {
    if (!(error instanceof SetupError)) throw error;
    err(`agents-docs: ${error.message}\n${USAGE}\n`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
