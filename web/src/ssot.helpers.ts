// SSOT consistency checks shared by ssot.spec.ts and its fixture tests.
// Pure parsing + file reads: no dependencies, TypeScript type-strippable, no node:test import.
//
// docs/ssot/requirements.md holds one `### R-NNN <title>` heading per requirement followed by key lines
// (layer, status, home, evidence, golden, test-name, accept). Rules, each reported with its code:
//   C1  IDs run R-001, R-002, ... in order with no gap and no repeat; the file has at least one requirement
//   C2  layer is core|supporting|out and status is current|planned|dropped
//   C3  a current requirement has an accept line and proof: a tag R-NNN in a test file, a golden label that
//       is a `scenario/label` key of a committed recording (web/src/parity/recorded/*.json) or of the request corpus
//       (test/golden/requests.js), or a test-name found verbatim in a test file (web/src/**/*.spec.ts, scripts/**/*.test.mjs).
//       Every golden label and test-name a current requirement cites must resolve (a stale pointer fires)
//   C4  every evidence entry names an existing file and a line inside it (planned and current; dropped is history).
//       An entry may carry an anchor, `path:N[-M] ~ <literal text>`: then the literal must occur inside the cited
//       lines (inside the file when no lines are cited), and the message names where the literal is now
//   C5  a test tag R-NNN points to a known requirement that is current
//   C6  no requirement title appears verbatim in any AGENTS.md of the repository (root and nested, outside
//       node_modules, .git, .next, graft, scratch, web/ssot-fixtures and web/arch-fixtures) or in docs/** outside docs/ssot/;
//       the root AGENTS.md mentions docs/ssot/requirements.md. README.md is upstream product documentation, not one
//       of our rule documents, so it is not scanned
//   C7  `home:` names where the requirement lives in the hexagonal tree: a path under web/src/<context>/ that exists
//       (a trailing `…`, `...`, `/*` or `/**` marks a prefix). Required from R-033 up;
//       R-001..R-032 are grandfathered and need none, but a home they do give is checked too
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export type RuleCode = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7';

export interface Violation {
  code: RuleCode;
  id: string; // requirement ID, or '' when the violation is about the file or a test tag
  message: string;
}

export const LAYERS = ['core', 'supporting', 'out'];
export const STATUSES = ['current', 'planned', 'dropped'];
export const SSOT_PATH = 'docs/ssot/requirements.md';
export const FIRST_ID_NEEDING_HOME = 33; // R-001..R-032 are grandfathered

export interface Requirement {
  id: string; // as written, e.g. R-014
  title: string;
  line: number; // heading line, 1-based
  layer: string; // '' when absent
  status: string; // '' when absent
  home: string; // '' when absent
  evidence: string[];
  golden: string[];
  testName: string[];
  accept: string[];
}

export interface SourceFile {
  file: string; // display path, posix
  text: string;
}

export interface Corpus {
  root: string; // evidence paths resolve against this directory
  testFiles: SourceFile[];
  docFiles: SourceFile[];
  agentsText: string;
  goldenLabels: Set<string>; // 'group/label'
}

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^###\s+(R-\d+)\b\s*(.*?)\s*$/;
const ANY_HEADING = /^#{1,3}\s/;
const KEY_LINE = /^\s*(?:[-*+]\s+)?(\*\*|__|`)?(layer|status|home|evidence|golden|test-name|accept)(?:\1)?\s*:(?:\1)?\s*(.*?)\s*$/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*?)\s*$/;
const NONE_VALUES = new Set(['-', '—', 'none', '(none)', 'n/a']);
const TAG = /\bR-(\d{3})\b/g;

function unwrap(value: string): string {
  let v = value.trim();
  for (;;) {
    const m = /^(`+|\*\*|__|")(.*)\1$/.exec(v);
    if (m === null) return v;
    v = m[2].trim();
  }
}

// Last line (1-based, inclusive) of each requirement's block, in the order of `reqs`: the line before the next
// `#`..`###` heading outside a code fence, or the last line of the text. Same fence rule as parseRequirements.
export function blockEndLines(text: string, reqs: Requirement[]): number[] {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const total = text.endsWith('\n') ? lines.length - 1 : lines.length;
  return reqs.map((req) => {
    let inFence = false;
    for (let i = req.line; i < total; i++) {
      if (FENCE.test(lines[i])) inFence = !inFence;
      else if (!inFence && ANY_HEADING.test(lines[i])) return i;
    }
    return total;
  });
}

// Parses requirement blocks. Tolerant of bullets, bold keys, backticks and blank lines between list items;
// ignores everything inside code fences and before the first requirement heading.
export function parseRequirements(text: string): Requirement[] {
  const out: Requirement[] = [];
  let current: Requirement | null = null;
  let listKey: 'evidence' | 'golden' | 'testName' | 'accept' | null = null;
  let inFence = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = HEADING.exec(line);
    if (heading !== null) {
      current = { id: heading[1], title: unwrap(heading[2]), line: i + 1, layer: '', status: '', home: '', evidence: [], golden: [], testName: [], accept: [] };
      out.push(current);
      listKey = null;
      continue;
    }
    if (ANY_HEADING.test(line)) {
      current = null;
      listKey = null;
      continue;
    }
    if (current === null) continue;
    // test titles and acceptance sentences are free text: a bullet there is an item even when it starts with a key word
    const isFreeTextItem: boolean = (listKey === 'testName' || listKey === 'accept') && BULLET.test(line);
    const key: RegExpExecArray | null = isFreeTextItem ? null : KEY_LINE.exec(line);
    if (key !== null) {
      const name: string = key[2];
      const value: string = key[3];
      if (name === 'layer' || name === 'status' || name === 'home') {
        if (current[name] === '') current[name] = unwrap(value);
        listKey = null;
        continue;
      }
      listKey = name === 'test-name' ? 'testName' : (name as 'evidence' | 'golden' | 'accept');
      if (value !== '') addItems(current, listKey, value, true);
      continue;
    }
    if (listKey === null || line.trim() === '') continue;
    const bullet = BULLET.exec(line);
    if (bullet !== null) addItems(current, listKey, bullet[1], false);
    else listKey = null;
  }
  return out;
}

function addItems(req: Requirement, key: 'evidence' | 'golden' | 'testName' | 'accept', value: string, inline: boolean): void {
  // evidence and golden entries never contain commas, so an inline list may be comma separated
  // except an anchored entry, whose literal text may contain commas
  const splittable = inline && (key === 'evidence' || key === 'golden') && !value.includes('~');
  const parts = splittable ? value.split(',') : [value];
  for (const part of parts) {
    const item = unwrap(part);
    if (item === '') continue;
    if (key !== 'accept' && NONE_VALUES.has(item.toLowerCase())) continue;
    req[key].push(item);
  }
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

export function checkIds(reqs: Requirement[], _corpus: Corpus): Violation[] {
  if (reqs.length === 0) {
    return [{ code: 'C1', id: '', message: 'zero requirements parsed; expected headings like "### R-001 <title>"' }];
  }
  const out: Violation[] = [];
  const seen = new Set<string>();
  reqs.forEach((req, index) => {
    const expected = `R-${pad3(index + 1)}`;
    if (seen.has(req.id)) out.push({ code: 'C1', id: req.id, message: `${req.id} repeats (line ${req.line})` });
    else if (req.id !== expected) out.push({ code: 'C1', id: req.id, message: `expected ${expected} but found ${req.id} (line ${req.line})` });
    seen.add(req.id);
  });
  return out;
}

export function checkEnums(reqs: Requirement[], _corpus: Corpus): Violation[] {
  const out: Violation[] = [];
  for (const req of reqs) {
    if (!LAYERS.includes(req.layer)) {
      out.push({ code: 'C2', id: req.id, message: `${req.id} layer '${req.layer}' is not one of ${LAYERS.join('|')}` });
    }
    if (!STATUSES.includes(req.status)) {
      out.push({ code: 'C2', id: req.id, message: `${req.id} status '${req.status}' is not one of ${STATUSES.join('|')}` });
    }
  }
  return out;
}

export function collectTags(testFiles: SourceFile[]): Map<string, string[]> {
  const tags = new Map<string, string[]>();
  for (const { file, text } of testFiles) {
    for (const m of text.matchAll(TAG)) {
      const id = `R-${m[1]}`;
      const files = tags.get(id) ?? [];
      if (!files.includes(file)) files.push(file);
      tags.set(id, files);
    }
  }
  return tags;
}

export function checkCurrentHasProof(reqs: Requirement[], corpus: Corpus): Violation[] {
  const out: Violation[] = [];
  const tags = collectTags(corpus.testFiles);
  for (const req of reqs) {
    if (req.status !== 'current') continue;
    if (req.accept.length === 0) out.push({ code: 'C3', id: req.id, message: `${req.id} is current but has no accept line` });
    for (const label of req.golden) {
      if (!corpus.goldenLabels.has(label)) out.push({ code: 'C3', id: req.id, message: `${req.id} cites golden label '${label}' that is not in the golden file` });
    }
    for (const name of req.testName) {
      if (!corpus.testFiles.some((f) => f.text.includes(name))) {
        out.push({ code: 'C3', id: req.id, message: `${req.id} cites test-name '${name}' that no test file contains verbatim` });
      }
    }
    const hasProof = tags.has(req.id) || req.golden.length > 0 || req.testName.length > 0;
    if (!hasProof) out.push({ code: 'C3', id: req.id, message: `${req.id} is current but has no proof (no tag ${req.id} in a test file, no golden label, no test-name)` });
  }
  return out;
}

function countLines(text: string): number {
  if (text === '') return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}

export interface EvidencePointer {
  file: string;
  from: number | null; // first cited line, 1-based; null when no line is cited
  to: number | null; // last cited line
  literal: string | null; // the text after `~`, null when the entry has no anchor
}

function stripBackticks(value: string): string {
  const m = /^(`+)(.*)\1$/.exec(value);
  return m === null ? value : m[2].trim();
}

// `file[:N[-M]] [~ literal]`. Returns null when the pointer part is malformed. The first `~` separates the
// pointer from the literal; spaces around it are trimmed and wrapping backticks are removed from both sides.
export function parseEvidencePointer(entry: string): EvidencePointer | null {
  const tilde = entry.indexOf('~');
  const pointer = stripBackticks((tilde === -1 ? entry : entry.slice(0, tilde)).trim());
  const literal = tilde === -1 ? null : stripBackticks(entry.slice(tilde + 1).trim());
  const m = /^([^\s:]+)(?::(\d+)(?:-(\d+))?)?$/.exec(pointer);
  if (m === null) return null;
  const from = m[2] === undefined ? null : Number(m[2]);
  const to = m[3] === undefined ? from : Number(m[3]);
  return { file: m[1], from, to, literal };
}

export function formatPointer(file: string, from: number | null, to: number | null): string {
  if (from === null) return file;
  return to === null || to === from ? `${file}:${from}` : `${file}:${from}-${to}`;
}

// 1-based numbers of the lines where `literal` starts, one entry per occurrence.
export function findLiteralLines(text: string, literal: string): number[] {
  const found: number[] = [];
  if (literal === '') return found;
  let at = text.indexOf(literal);
  while (at !== -1) {
    found.push(text.slice(0, at).split('\n').length);
    at = text.indexOf(literal, at + literal.length);
  }
  return found;
}

// The text of lines from..to (1-based, inclusive); the whole text when no lines are cited.
export function citedText(text: string, from: number | null, to: number | null): string {
  if (from === null || to === null) return text;
  return text.split('\n').slice(from - 1, to).join('\n');
}

function where(file: string, lines: number[]): string {
  return lines.map((line) => `${file}:${line}`).join(', ');
}

export function checkEvidence(reqs: Requirement[], corpus: Corpus): Violation[] {
  const out: Violation[] = [];
  const root = path.resolve(corpus.root);
  for (const req of reqs) {
    if (req.status === 'dropped') continue; // dropped keeps its number; its evidence may be gone
    for (const entry of req.evidence) {
      const pointer = parseEvidencePointer(entry);
      if (pointer === null) {
        out.push({ code: 'C4', id: req.id, message: `${req.id} evidence '${entry}' is not file[:N[-M]] [~ literal]` });
        continue;
      }
      const { file, from, to, literal } = pointer;
      const full = path.resolve(root, file);
      if (path.isAbsolute(file) || (full !== root && !full.startsWith(root + path.sep))) {
        out.push({ code: 'C4', id: req.id, message: `${req.id} evidence '${entry}' points outside the repository` });
        continue;
      }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        out.push({ code: 'C4', id: req.id, message: `${req.id} evidence file '${file}' is missing` });
        continue;
      }
      if (literal === '') {
        out.push({ code: 'C4', id: req.id, message: `${req.id} evidence '${entry}' has an anchor with an empty literal` });
        continue;
      }
      const text = fs.readFileSync(full, 'utf8');
      if (from !== null && to !== null) {
        const total = countLines(text);
        if (from < 1 || to < from) {
          out.push({ code: 'C4', id: req.id, message: `${req.id} evidence '${entry}' has an invalid line range` });
          continue;
        }
        if (to > total) {
          out.push({ code: 'C4', id: req.id, message: `${req.id} evidence '${entry}' is beyond the end of ${file} (${total} lines)` });
          continue;
        }
      }
      if (literal === null) continue;
      if (citedText(text, from, to).includes(literal)) continue;
      const now = findLiteralLines(text, literal);
      const detail = now.length === 0 ? `the literal is not found anywhere in ${file}` : `the literal is now at ${where(file, now)}`;
      out.push({ code: 'C4', id: req.id, message: `${req.id} evidence '${entry}' does not contain its literal '${literal}' at the cited lines; ${detail}` });
    }
  }
  return out;
}

const PREFIX_MARK = /(?:…|\.\.\.|\/\*\*?)$/;

function homeProblem(home: string, root: string): string | null {
  if (!home.startsWith('web/src/')) return `home '${home}' is not a path under web/src/<context>/…`;
  const target = home.replace(PREFIX_MARK, '');
  const segments = target.split('/').filter((part) => part !== '');
  if (segments.includes('..') || segments.includes('.')) return `home '${home}' must stay under web/src`;
  if (segments.length < 3) return `home '${home}' names no context directory under web/src`;
  const full = path.resolve(root, ...segments);
  if (fs.existsSync(full)) return null;
  if (PREFIX_MARK.test(home) && fs.existsSync(path.dirname(full))) {
    const stem = path.basename(full);
    if (fs.readdirSync(path.dirname(full)).some((name) => name.startsWith(stem))) return null;
  }
  return `home '${home}' does not exist in the repository`;
}

export function checkHomes(reqs: Requirement[], corpus: Corpus): Violation[] {
  const out: Violation[] = [];
  const root = path.resolve(corpus.root);
  for (const req of reqs) {
    const number = Number(req.id.slice(2));
    if (req.home === '') {
      if (number >= FIRST_ID_NEEDING_HOME) out.push({ code: 'C7', id: req.id, message: `${req.id} has no home (required from R-${pad3(FIRST_ID_NEEDING_HOME)}; web/src/<context>/…)` });
      continue;
    }
    const problem = homeProblem(req.home, root);
    if (problem !== null) out.push({ code: 'C7', id: req.id, message: `${req.id} ${problem}` });
  }
  return out;
}

export function checkTags(reqs: Requirement[], corpus: Corpus): Violation[] {
  const out: Violation[] = [];
  const byId = new Map(reqs.map((r) => [r.id, r]));
  for (const [id, files] of collectTags(corpus.testFiles)) {
    const req = byId.get(id);
    const where = files.join(', ');
    if (req === undefined) out.push({ code: 'C5', id: '', message: `tag ${id} in ${where} points to an unknown requirement` });
    else if (req.status === 'planned') out.push({ code: 'C5', id, message: `tag ${id} in ${where} points to a planned requirement` });
    else if (req.status === 'dropped') out.push({ code: 'C5', id, message: `tag ${id} in ${where} points to a dropped requirement` });
  }
  return out;
}

export function checkNoDuplicatedTitles(reqs: Requirement[], corpus: Corpus): Violation[] {
  const out: Violation[] = [];
  if (!corpus.agentsText.includes(SSOT_PATH)) {
    out.push({ code: 'C6', id: '', message: `AGENTS.md does not mention ${SSOT_PATH}` });
  }
  for (const req of reqs) {
    if (req.title === '') continue;
    for (const doc of corpus.docFiles) {
      if (doc.text.includes(req.title)) out.push({ code: 'C6', id: req.id, message: `${req.id} title '${req.title}' appears verbatim in ${doc.file}` });
    }
  }
  return out;
}

export function checkAll(reqs: Requirement[], corpus: Corpus): Violation[] {
  return [
    ...checkIds(reqs, corpus),
    ...checkEnums(reqs, corpus),
    ...checkCurrentHasProof(reqs, corpus),
    ...checkEvidence(reqs, corpus),
    ...checkTags(reqs, corpus),
    ...checkNoDuplicatedTitles(reqs, corpus),
    ...checkHomes(reqs, corpus),
  ];
}

export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return '(no violations)';
  return violations.map((v) => `${v.code} ${v.message}`).join('\n');
}

export function unclaimedGoldenLabels(reqs: Requirement[], goldenLabels: Set<string>): string[] {
  const claimed = new Set(reqs.flatMap((r) => r.golden));
  return [...goldenLabels].filter((label) => !claimed.has(label)).sort();
}

// Golden labels are `scenario/label` keys. They come from the committed recordings (the legacy portal's answers,
// web/src/parity/recorded/*.json) and from the request corpus (test/golden/requests.js), which also holds the
// scenarios no recording covers.
export function loadGoldenLabels(repoRoot: string): Set<string> {
  const labels = new Set<string>();
  const recorded = path.join(repoRoot, 'web', 'src', 'parity', 'recorded');
  if (fs.existsSync(recorded)) {
    for (const name of fs.readdirSync(recorded).filter((n) => n.endsWith('.json')).sort()) {
      const recording = JSON.parse(fs.readFileSync(path.join(recorded, name), 'utf8')) as { results?: { key?: unknown }[] };
      for (const result of recording.results ?? []) if (typeof result.key === 'string') labels.add(result.key);
    }
  }
  const corpusFile = path.join(repoRoot, 'test', 'golden', 'requests.js');
  if (fs.existsSync(corpusFile)) {
    const corpus = createRequire(corpusFile)(corpusFile) as { scenarios?: { name: string; steps: { label: string }[] }[] };
    for (const scenario of corpus.scenarios ?? []) for (const step of scenario.steps) labels.add(`${scenario.name}/${step.label}`);
  }
  if (labels.size === 0) throw new Error(`no labels: neither web/src/parity/recorded/*.json nor the request corpus ${corpusFile} gave any under ${repoRoot}`);
  return labels;
}

function walk(dir: string, accept: (name: string) => boolean, skipDir: (full: string) => boolean = () => false): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !skipDir(full)) out.push(...walk(full, accept, skipDir));
    } else if (accept(entry.name)) {
      out.push(full);
    }
  }
  return out.sort();
}

const TAG_EXAMPLE_SPECS = new Set(['ssot.spec.ts', 'ssot-show.spec.ts']);
const AGENTS_SKIP_DIR_NAMES = new Set(['.git', '.next', 'graft', 'scratch']);
const AGENTS_SKIP_DIRS = ['web/ssot-fixtures', 'web/arch-fixtures'];

// Every AGENTS.md below repoRoot except the root one, skipping tool output and fixture trees.
function nestedAgentsFiles(repoRoot: string): string[] {
  const skip = (full: string): boolean => {
    const rel = path.relative(repoRoot, full).split(path.sep).join('/');
    return AGENTS_SKIP_DIR_NAMES.has(path.basename(full)) || AGENTS_SKIP_DIRS.includes(rel);
  };
  return walk(repoRoot, (n) => n === 'AGENTS.md', skip).filter((f) => path.relative(repoRoot, f) !== 'AGENTS.md');
}

function readSources(root: string, files: string[]): SourceFile[] {
  return files.map((full) => ({ file: path.relative(root, full).split(path.sep).join('/'), text: fs.readFileSync(full, 'utf8') }));
}

// Fixture case dir: requirements.md, tests.txt (one test file), docs.md (AGENTS.md and the only doc); labels come from repoRoot.
export function loadFixtureCorpus(dir: string, repoRoot: string): { corpus: Corpus; requirements: Requirement[] } {
  const need = (name: string): string => {
    const full = path.join(dir, name);
    if (!fs.existsSync(full)) throw new Error(`missing ${full}`);
    return fs.readFileSync(full, 'utf8');
  };
  const requirements = parseRequirements(need('requirements.md'));
  const docs = need('docs.md');
  const corpus: Corpus = {
    root: dir,
    testFiles: [{ file: 'tests.txt', text: need('tests.txt') }],
    docFiles: [{ file: 'docs.md', text: docs }],
    agentsText: docs,
    goldenLabels: loadGoldenLabels(repoRoot),
  };
  return { corpus, requirements };
}

// Real repository: tests are web/src/**/*.spec.ts (except ssot.spec.ts and ssot-show.spec.ts, which mention tags as examples)
// and the root tooling tests scripts/**/*.test.mjs; docs scanned for restated titles are every non-fixture AGENTS.md
// (root first, then nested ones) and docs/** outside docs/ssot/.
export function loadRealCorpus(repoRoot: string): { corpus: Corpus; requirements: Requirement[] } {
  const ssot = path.join(repoRoot, SSOT_PATH);
  if (!fs.existsSync(ssot)) throw new Error(`missing ${SSOT_PATH}`);
  const requirements = parseRequirements(fs.readFileSync(ssot, 'utf8'));
  const agents = path.join(repoRoot, 'AGENTS.md');
  if (!fs.existsSync(agents)) throw new Error('missing AGENTS.md');
  const specs = walk(path.join(repoRoot, 'web', 'src'), (n) => n.endsWith('.spec.ts')).filter((f) => !TAG_EXAMPLE_SPECS.has(path.basename(f)));
  const toolTests = walk(path.join(repoRoot, 'scripts'), (n) => n.endsWith('.test.mjs'));
  const ssotDir = path.join(repoRoot, 'docs', 'ssot');
  const docs = walk(path.join(repoRoot, 'docs'), (n) => n.endsWith('.md'), (full) => full === ssotDir);
  const corpus: Corpus = {
    root: repoRoot,
    testFiles: readSources(repoRoot, [...specs, ...toolTests]),
    docFiles: readSources(repoRoot, [agents, ...nestedAgentsFiles(repoRoot), ...docs]),
    agentsText: fs.readFileSync(agents, 'utf8'),
    goldenLabels: loadGoldenLabels(repoRoot),
  };
  return { corpus, requirements };
}
