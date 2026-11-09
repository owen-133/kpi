// Architecture checks shared by architecture.spec.ts and its fixture tests.
// Pure regex + file walk: no dependencies, TypeScript type-strippable.
import fs from 'node:fs';
import path from 'node:path';

export type RuleId = 'R1' | 'R2' | 'R6' | 'APP' | 'CONTAINER' | 'ORM' | 'FRAMEWORK' | 'SERVER_ONLY' | 'BANNED' | 'USE_CLIENT' | 'UI' | 'STYLE';

export interface Violation {
  rule: RuleId;
  file: string;
  line: number;
  message: string;
}

export type Layer = 'app' | 'container' | 'adapter' | 'domain' | 'application' | 'other';

export interface Placement {
  layer: Layer;
  side: string;
  pkg: string;
  segments: string[];
}

export interface ImportRef {
  spec: string;
  line: number;
}

const SOURCE_EXT = /\.(ts|tsx)$/;
const TEST_FILE = /\.(spec|test)\.tsx?$/;
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

export function toPosix(p: string): string {
  return p.split(path.sep).join('/').replace(/\\/g, '/');
}

export function isTestFile(file: string): boolean {
  return TEST_FILE.test(file);
}

// Source files under dir. Skips node_modules, .next, *.d.ts and the architecture checker itself.
export function collectFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (
        SOURCE_EXT.test(entry.name) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.startsWith('architecture.')
      ) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out.sort();
}

// Path below the last "/src/" segment, or null when the path is not inside a src tree.
export function relFromSrc(absPosix: string): string | null {
  const idx = absPosix.lastIndexOf('/src/');
  return idx === -1 ? null : absPosix.slice(idx + 5);
}

// Layer of a path below src. For import targets the last segment may be a directory.
export function classify(rel: string, isTarget: boolean): Placement {
  const segments = rel.split('/');
  const dirs = isTarget ? segments : segments.slice(0, -1);
  const blank = { side: '', pkg: '', segments };
  if (segments[0] === 'app') return { layer: 'app', ...blank };
  if (rel === 'config/container.ts' || rel === 'config/container') {
    return { layer: 'container', ...blank };
  }
  const ai = dirs.indexOf('adapter');
  if (ai !== -1 && (dirs[ai + 1] === 'in' || dirs[ai + 1] === 'out')) {
    return { layer: 'adapter', side: dirs[ai + 1], pkg: dirs[ai + 2] ?? '', segments };
  }
  if (dirs.includes('domain')) return { layer: 'domain', ...blank };
  if (dirs.includes('application')) return { layer: 'application', ...blank };
  return { layer: 'other', ...blank };
}

export function placementOfFile(file: string): Placement | null {
  const rel = relFromSrc(toPosix(path.resolve(file)));
  return rel === null ? null : classify(rel, false);
}

// Replace comments (and optionally string contents) with spaces, keeping newlines and offsets.
export function mask(source: string, blankStrings: boolean): string {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < n) {
        out += '  ';
        i += 2;
      }
    } else if (ch === "'" || ch === '"' || ch === '`') {
      out += ch;
      i++;
      while (i < n && source[i] !== ch) {
        if (source[i] === '\\' && i + 1 < n) {
          out += blankStrings ? '  ' : source[i] + source[i + 1];
          i += 2;
          continue;
        }
        if (source[i] === '\n' && ch !== '`') break;
        out += blankStrings && source[i] !== '\n' ? ' ' : source[i];
        i++;
      }
      if (i < n && source[i] === ch) {
        out += ch;
        i++;
      }
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

// Module specifiers of import/export-from/dynamic import/require.
export function extractImports(source: string): ImportRef[] {
  const code = mask(source, false);
  const found: ImportRef[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\sfrom\s*)?(['"])([^'"\n]+)\1/g,
    /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
    /\brequire\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const m of code.matchAll(pattern)) {
      found.push({ spec: m[2], line: lineOf(code, m.index ?? 0) });
    }
  }
  return found;
}

// Path below src that the specifier points to, or null for packages and paths outside src.
export function resolveImport(file: string, spec: string): string | null {
  if (spec.startsWith('@/')) return spec.slice(2);
  if (!spec.startsWith('.')) return null;
  const dir = path.posix.dirname(toPosix(path.resolve(file)));
  return relFromSrc(path.posix.resolve(dir, spec));
}

function isRelative(spec: string): boolean {
  return spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..';
}

function violation(rule: RuleId, file: string, line: number, message: string): Violation {
  return { rule, file: toPosix(file), line, message };
}

// Rule 1: domain/ and application/ import no package and nothing from adapter.
export function checkRule1(file: string, source: string): Violation[] {
  const where = placementOfFile(file);
  if (where === null || isTestFile(file)) return [];
  if (where.layer !== 'domain' && where.layer !== 'application') return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    if (!isRelative(ref.spec)) {
      out.push(violation('R1', file, ref.line, `${where.layer} imports package '${ref.spec}'`));
      continue;
    }
    const rel = resolveImport(file, ref.spec);
    const target = rel === null ? null : classify(rel, true);
    if (/(^|\/)adapter(\/|$)/.test(ref.spec) || target?.layer === 'adapter') {
      out.push(violation('R1', file, ref.line, `${where.layer} imports adapter path '${ref.spec}'`));
    }
  }
  return out;
}

// Class members declared at class-body level, one entry per field with its modifiers.
function findClassFields(code: string): Array<{ name: string; line: number }> {
  const found: Array<{ name: string; line: number }> = [];
  const stack: Array<{ kind: string; saved: string; savedLine: number }> = [];
  let head = '';
  let headLine = 1;
  let line = 1;
  const top = (): string => (stack.length > 0 ? stack[stack.length - 1].kind : 'other');
  const append = (ch: string): void => {
    if (head.trim() === '' && ch.trim() !== '') headLine = line;
    head += ch;
  };
  const balanced = (text: string): boolean =>
    text.split('(').length === text.split(')').length &&
    text.split('[').length === text.split(']').length;
  const opensMore = (text: string): boolean => /(=>|[=,|&(<:.?\[])\s*$/.test(text.trim());
  const evaluate = (): void => {
    let s = head.trim().replace(/@\w+(\([^)]*\))?\s*/g, '');
    if (s === '') return;
    const mods = new Set<string>();
    let m = /^(public|private|protected|static|readonly|declare|override|abstract|accessor)\s+/.exec(s);
    while (m) {
      mods.add(m[1]);
      s = s.slice(m[0].length);
      m = /^(public|private|protected|static|readonly|declare|override|abstract|accessor)\s+/.exec(s);
    }
    const f = /^(#?[\w$]+)\s*[?!]?\s*(?::|=|$)/.exec(s);
    if (!f) return;
    const name = f[1];
    if (name.startsWith('#') || mods.has('readonly') || mods.has('private') || mods.has('protected')) {
      return;
    }
    found.push({ name, line: headLine });
  };
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '\n') {
      if (top() === 'class' && head.trim() !== '' && balanced(head) && !opensMore(head)) {
        const rest = code.slice(i + 1).trimStart();
        if (!/^[|&.?:,)=+]/.test(rest)) {
          evaluate();
          head = '';
        }
      }
      line++;
      append(ch);
    } else if (ch === ';') {
      if (top() === 'class') evaluate();
      head = '';
    } else if (ch === '{') {
      let kind: string;
      if (/\bclass\b/.test(head)) kind = 'class';
      else if (top() === 'class') kind = !balanced(head) || opensMore(head) ? 'value' : 'method';
      else kind = 'other';
      stack.push({ kind, saved: head, savedLine: headLine });
      head = '';
    } else if (ch === '}') {
      const frame = stack.pop();
      if (frame && frame.kind === 'value') {
        head = frame.saved + '{}';
        headLine = frame.savedLine;
      } else {
        head = '';
      }
    } else {
      append(ch);
    }
  }
  return found;
}

// Rule 2: domain/ has no setter and no public mutable class field.
export function checkRule2(file: string, source: string): Violation[] {
  const where = placementOfFile(file);
  if (where === null || isTestFile(file) || where.layer !== 'domain') return [];
  const code = mask(source, true);
  const out: Violation[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\bset\s+[#\w$]+\s*\(/g, 'setter accessor'],
    [/\bset[A-Z][\w$]*\s*\(/g, 'setter method'],
    [/@Setter\b/g, '@Setter annotation'],
  ];
  for (const [pattern, label] of patterns) {
    for (const m of code.matchAll(pattern)) {
      out.push(violation('R2', file, lineOf(code, m.index ?? 0), `${label} '${m[0].trim()}'`));
    }
  }
  for (const f of findClassFields(code)) {
    out.push(violation('R2', file, f.line, `public mutable field '${f.name}' (needs readonly/private/#)`));
  }
  return out;
}

// Rule 6: adapters stay inside their own package and reach core only through domain/application ports.
export function checkRule6(file: string, source: string): Violation[] {
  const where = placementOfFile(file);
  if (where === null || where.layer !== 'adapter') return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    const rel = resolveImport(file, ref.spec);
    if (rel === null) continue;
    const target = classify(rel, true);
    if (target.layer === 'adapter') {
      const otherSide = target.side !== where.side;
      const otherPkg = target.pkg !== '' && where.pkg !== '' && target.pkg !== where.pkg;
      if (otherSide || otherPkg) {
        out.push(violation('R6', file, ref.line, `adapter ${where.side}/${where.pkg} imports adapter ${target.side}/${target.pkg} ('${ref.spec}')`));
      }
    } else if (target.layer === 'application' && !target.segments.includes('port')) {
      out.push(violation('R6', file, ref.line, `adapter imports application outside port/ ('${ref.spec}')`));
    }
  }
  return out;
}

// src/app/** reaches core only via adapter/in/web and config/container.ts.
export function checkAppBoundary(file: string, source: string): Violation[] {
  const where = placementOfFile(file);
  if (where === null || where.layer !== 'app') return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    const rel = resolveImport(file, ref.spec);
    if (rel === null) continue;
    const target = classify(rel, true);
    if (target.layer === 'domain' || target.layer === 'application') {
      out.push(violation('APP', file, ref.line, `app imports ${target.layer} ('${ref.spec}')`));
    } else if (target.layer === 'adapter') {
      const web = target.side === 'in' && target.pkg === 'web';
      if (!web) {
        out.push(violation('APP', file, ref.line, `app imports adapter ${target.side}/${target.pkg} ('${ref.spec}')`));
      }
    }
  }
  return out;
}

// Only config/container.ts imports adapter/out (code inside adapter/out itself is exempt).
export function checkContainerOnly(file: string, source: string): Violation[] {
  const where = placementOfFile(file);
  if (where === null || where.layer === 'container') return [];
  if (where.layer === 'adapter' && where.side === 'out') return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    const rel = resolveImport(file, ref.spec);
    if (rel === null) continue;
    const target = classify(rel, true);
    if (target.layer === 'adapter' && target.side === 'out') {
      out.push(violation('CONTAINER', file, ref.line, `only config/container.ts may import adapter/out ('${ref.spec}')`));
    }
  }
  return out;
}

// ORM and database driver packages: importable only under */adapter/out/**, shared/adapter/out/** and config/**.
const ORM_PACKAGES = ['drizzle-orm', 'postgres', '@electric-sql/pglite'];

function isOrmPackage(spec: string): boolean {
  return ORM_PACKAGES.some((name) => spec === name || spec.startsWith(`${name}/`));
}

function isInWebAdapter(rel: string): boolean {
  return /(^|\/)adapter\/in\/web\//.test(rel);
}

function isConfig(rel: string): boolean {
  return rel.startsWith('config/');
}

function isOutAdapter(rel: string): boolean {
  return /(^|\/)adapter\/out\//.test(rel);
}

// Where framework code (react, next, tanstack) may live: driving web adapters, the Next app folder, proxy and instrumentation.
function isFrameworkPlace(rel: string): boolean {
  return isInWebAdapter(rel) || rel.startsWith('app/') || rel === 'proxy.ts' || rel === 'instrumentation.ts';
}

export function checkOrmOnlyInPersistence(file: string, source: string): Violation[] {
  const rel = relFromSrc(toPosix(path.resolve(file)));
  if (rel === null) return [];
  if (isOutAdapter(rel) || isConfig(rel)) return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    if (isOrmPackage(ref.spec)) {
      out.push(violation('ORM', file, ref.line, `only */adapter/out/**, shared/adapter/out/** and config/** may import '${ref.spec}'`));
    }
  }
  return out;
}

const isFrameworkPackage = (spec: string): boolean =>
  spec === 'react' || spec === 'react-dom' || spec === 'next' || /^(react|react-dom|next)\//.test(spec) || spec.startsWith('@tanstack/');

export function checkFrameworkPlacement(file: string, source: string): Violation[] {
  const rel = relFromSrc(toPosix(path.resolve(file)));
  if (rel === null || isFrameworkPlace(rel)) return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    if (isFrameworkPackage(ref.spec)) {
      out.push(violation('FRAMEWORK', file, ref.line, `only */adapter/in/web/**, src/app/**, src/proxy.ts and src/instrumentation.ts may import '${ref.spec}'`));
    }
  }
  return out;
}

export function checkServerOnlyPlacement(file: string, source: string): Violation[] {
  const rel = relFromSrc(toPosix(path.resolve(file)));
  if (rel === null || isFrameworkPlace(rel) || rel.startsWith('shared/adapter/out/') || isConfig(rel)) return [];
  return extractImports(source)
    .filter((ref) => ref.spec === 'server-only')
    .map((ref) => violation('SERVER_ONLY', file, ref.line, "'server-only' belongs in */adapter/in/web/**, src/app/**, proxy, instrumentation, shared/adapter/out/** and config/**"));
}

// Tokens that never appear in src (tests excluded: they spell them out to prove the bans).
const BANNED_TOKENS = ['dangerouslySetInnerHTML', 'sql.raw', '.unsafe(', 'NEXT_PUBLIC_'];

export function checkBannedTokens(file: string, source: string): Violation[] {
  if (relFromSrc(toPosix(path.resolve(file))) === null || isTestFile(file)) return [];
  const code = mask(source, false);
  const out: Violation[] = [];
  for (const token of BANNED_TOKENS) {
    let at = code.indexOf(token);
    while (at !== -1) {
      out.push(violation('BANNED', file, lineOf(code, at), `banned token '${token}'`));
      at = code.indexOf(token, at + token.length);
    }
  }
  return out;
}

export function checkUseClientPlacement(file: string, source: string): Violation[] {
  const rel = relFromSrc(toPosix(path.resolve(file)));
  if (rel === null || isInWebAdapter(rel) || rel.startsWith('app/')) return [];
  const match = /^\s*(['"])use client\1/m.exec(source);
  return match === null ? [] : [violation('USE_CLIENT', file, lineOf(source, match.index), "'use client' only in */adapter/in/web/** and src/app/**")];
}

// Packages a ui file may import (plus their subpaths).
const UI_PACKAGES = ['react', 'react-dom', '@tanstack/react-query', 'pdf-lib', '@pdf-lib/fontkit'];

function isUiPackage(spec: string): boolean {
  return UI_PACKAGES.some((name) => spec === name || spec.startsWith(`${name}/`));
}

const isUiFolder = (rel: string): boolean => /(^|\/)adapter\/in\/web\/ui\//.test(rel);

// UI rule: non-test files under */adapter/in/web/ui/** import only ui files, domain, css and the UI packages.
export function checkUiBoundary(file: string, source: string): Violation[] {
  const rel = relFromSrc(toPosix(path.resolve(file)));
  if (rel === null || isTestFile(file) || !isUiFolder(rel)) return [];
  const out: Violation[] = [];
  for (const ref of extractImports(source)) {
    if (/\.css$/.test(ref.spec)) continue;
    if (!isRelative(ref.spec) && !ref.spec.startsWith('@/')) {
      if (!isUiPackage(ref.spec)) out.push(violation('UI', file, ref.line, `ui imports package '${ref.spec}'`));
      continue;
    }
    const target = resolveImport(file, ref.spec);
    if (target === null) {
      out.push(violation('UI', file, ref.line, `ui imports a path outside src ('${ref.spec}')`));
      continue;
    }
    const placed = classify(target, true);
    const allowed = placed.layer === 'domain' || (placed.layer === 'adapter' && isUiFolder(`${target}/`));
    if (!allowed) out.push(violation('UI', file, ref.line, `ui imports outside ui and domain ('${ref.spec}')`));
  }
  return out;
}

// STYLE rule: no style prop in non-test tsx files (CSP drops style attributes in server-rendered HTML).
export function checkNoStyleProp(file: string, source: string): Violation[] {
  if (relFromSrc(toPosix(path.resolve(file))) === null || isTestFile(file) || !/\.tsx$/.test(file)) return [];
  const code = mask(source, true);
  const out: Violation[] = [];
  for (const m of code.matchAll(/\bstyle\s*=\s*\{/g)) {
    out.push(violation('STYLE', file, lineOf(code, m.index ?? 0), "style prop 'style={' (use CSS classes or set styles from an effect)"));
  }
  return out;
}

export function checkAll(file: string, source: string): Violation[] {
  return [
    ...checkRule1(file, source),
    ...checkRule2(file, source),
    ...checkRule6(file, source),
    ...checkAppBoundary(file, source),
    ...checkContainerOnly(file, source),
    ...checkOrmOnlyInPersistence(file, source),
    ...checkFrameworkPlacement(file, source),
    ...checkServerOnlyPlacement(file, source),
    ...checkBannedTokens(file, source),
    ...checkUseClientPlacement(file, source),
    ...checkUiBoundary(file, source),
    ...checkNoStyleProp(file, source),
  ];
}

export function scanTree(root: string): { files: string[]; violations: Violation[] } {
  const files = collectFiles(root);
  const violations: Violation[] = [];
  for (const file of files) violations.push(...checkAll(file, fs.readFileSync(file, 'utf8')));
  return { files, violations };
}

export function formatViolations(violations: Violation[]): string {
  return violations.map((v) => `[${v.rule}] ${v.file}:${v.line} ${v.message}`).join('\n');
}
