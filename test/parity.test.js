// Parity of constants that are copied across files (JS, Svelte, SQL).
// Every copy is read as TEXT with a regex anchored on the surrounding code; no server code is
// imported and no server is started. An extractor that finds nothing throws, so a refactor
// cannot make a group pass vacuously. A group passes only when all copies agree.
//
// Normalization per group kind:
//   list    ordered list of labels, compared in order.
//   set     set of column / field names, compared sorted (SQL column lists and JS arrays
//           carry the same names, the order of a column list is not part of the contract).
//   number  a number after normalization to ONE unit per group:
//           - attachment size: bytes. Literals written as `1048576` are bytes already;
//             literals written as `1MB` are multiplied by 1048576 (binary MiB, the value
//             the code itself uses for 1MB).
//           - base64 cap: characters. A byte limit b maps to ceil(b/3)*4 (base64 length).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readReal = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// ---- parsers: captured text -> value ----
const quoted = s => [...s.matchAll(/'([^']*)'/g)].map(m => m[1]);
const objectKeys = s => [...s.matchAll(/'([^']*)'\s*:/g)].map(m => m[1]);
const columns = s => s.split(',').map(x => x.trim()).filter(Boolean);
const payloadKeys = s => [...s.matchAll(/payload->>'(\w+)'/g)].map(m => m[1]);
const int = s => Number(s);
const mib = s => Number(s) * 1048576;
const base64Of = bytes => Math.ceil(bytes / 3) * 4;

// ---- copy specs ----
// pattern: one capture group, global + `d` flags. count: exact number of matches in the file.
const copy = (file, what, pattern, parse, extra = {}) => ({file, what, pattern, parse, count: 1, ...extra});

// ---- extractor ----
function lineOf(text, index) { return text.slice(0, index).split('\n').length; }

export function extractCopy(spec, readText) {
  const text = readText(spec.file);
  const matches = [...text.matchAll(new RegExp(spec.pattern.source, 'dg'))];
  if (matches.length === 0) throw new Error(`extractor matched nothing: ${spec.file} ${spec.what}`);
  if (matches.length !== spec.count) {
    throw new Error(`extractor matched ${matches.length} times, expected ${spec.count}: ${spec.file} ${spec.what}`);
  }
  return matches.map(m => {
    const [start, end] = m.indices[1];
    const value = spec.parse(m[1]);
    if (Array.isArray(value) ? value.length === 0 : !Number.isFinite(value)) {
      throw new Error(`extractor matched nothing: ${spec.file} ${spec.what} (captured text parsed to no value)`);
    }
    const normalize = spec.normalize || (v => v);
    return {file: spec.file, what: spec.what, line: lineOf(text, start), span: [start, end],
      value, key: JSON.stringify(spec.kind === 'set' ? [...normalize(value)].sort() : normalize(value))};
  });
}

export function extractGroup(group, readText) {
  return group.copies.flatMap(spec => extractCopy({...spec, kind: group.kind}, readText));
}

// Returns the divergence report, or null when all copies agree.
export function compareGroup(group, readText) {
  const entries = extractGroup(group, readText);
  if (new Set(entries.map(e => e.key)).size === 1) return null;
  const lines = entries.map(e => `  ${e.file}:${e.line} (${e.what}) = ${e.key}`);
  return `parity group "${group.name}" diverges:\n${lines.join('\n')}`;
}

// ---- the groups ----
const STATUS_DEFAULT = String.raw`\[([^\]]*)\]`;
const NEW_STATUS = String.raw`new_status not in \(([^)]*)\)`;
const FIELDS = String.raw`'title','requester','department','channel','category','priority','requested_at','due_date','description'`;

export const groups = [
  {name: 'status list', kind: 'list', copies: [
    copy('frontend/src/Board.svelte', 'const statuses', new RegExp(String.raw`const statuses=` + STATUS_DEFAULT), quoted),
    copy('frontend/src/board/format.js', 'taskState keys', /taskState=status=>\(\{([^}]*)\}\[status\]/, objectKeys),
    copy('public/app.js', 'const statuses', new RegExp(String.raw`const statuses=` + STATUS_DEFAULT), quoted),
    copy('public/kpi-model.js', 'statuses counter list', /Object\.fromEntries\(\[([^\]]*)\]\.map\(s=>\[s,received/, quoted),
    copy('server.js', 'const statuses', new RegExp(String.raw`const statuses=` + STATUS_DEFAULT), quoted),
    copy('supabase/schema.sql', 'check(status in ...)', /status text not null default '접수' check\(status in \(([^)]*)\)\)/, quoted),
    copy('supabase/schema.sql', 'new_status not in', new RegExp(NEW_STATUS), quoted),
    copy('supabase/deletion.sql', 'new_status not in', new RegExp(NEW_STATUS), quoted),
    // upgrade.sql is the concatenation of the files above (scripts/build-upgrade.js).
    copy('supabase/upgrade.sql', 'check(status in ...)', /status text not null default '접수' check\(status in \(([^)]*)\)\)/, quoted),
    copy('supabase/upgrade.sql', 'new_status not in', new RegExp(NEW_STATUS), quoted, {count: 2}),
  ]},
  {name: 'task field set', kind: 'set', copies: [
    copy('server.js', 'const fields', /const fields=\[([^\]]*)\]/, quoted),
    // local-store.js INSERT: the columns between `id,` and `,status,` are the editable fields.
    copy('local-store.js', 'INSERT INTO tasks columns', /INSERT INTO tasks\(id,([A-Za-z_,]+?),status,/, columns),
    copy('local-store.js', 'INSERT values map', /\.\.\.\[([^\]]*)\]\.map\(k=>v\[k\]\)/, quoted),
    copy('task-edit.js', 'editableFields', /editableFields=\[([^\]]*)\]/, quoted),
    copy('supabase/edit.sql', 'foreach k in array', /foreach k in array array\[([^\]]*)\]/, quoted),
    copy('supabase/deletion.sql', 'insert into tasks columns', /insert into orbit_private\.tasks\(([^)]*)\)/, columns),
    copy('supabase/deletion.sql', 'insert values payload keys', /orbit_private\.tasks\([^)]*\)\s*values\(([^;]*?)\) returning \* into t/, payloadKeys),
    copy('supabase/schema.sql', 'insert into tasks columns', /insert into orbit_private\.tasks\(([^)]*)\)/, columns),
    copy('supabase/schema.sql', 'insert values payload keys', /orbit_private\.tasks\([^)]*\)\s*values\(([^;]*?)\) returning \* into t/, payloadKeys),
    copy('supabase/upgrade.sql', 'insert into tasks columns', /insert into orbit_private\.tasks\(([^)]*)\)/, columns, {count: 2}),
    copy('supabase/upgrade.sql', 'insert values payload keys', /orbit_private\.tasks\([^)]*\)\s*values\(([^;]*?)\) returning \* into t/, payloadKeys, {count: 2}),
    copy('supabase/upgrade.sql', 'foreach k in array', /foreach k in array array\[([^\]]*)\]/, quoted),
  ]},
  {name: 'attachment max size (bytes)', kind: 'number', copies: [
    copy('server.js', 'buffer.length>', /buffer\.length>(\d+)/, int),
    copy('server.js', 'message "N MB"', /첨부파일은 (\d+)MB 이하/, mib),
    copy('public/kpi-ui.js', 'f.size>', /f\.size>(\d+)/, int),
    copy('public/kpi-ui.js', 'message "~N MB"', /1바이트~(\d+)MB/, mib),
    copy('supabase/kpi.sql', "(payload->>'size')::integer>", /\(payload->>'size'\)::integer>(\d+)/, int),
    copy('supabase/kpi.sql', 'message "N MB"', /첨부파일은 (\d+)MB 이하/, mib),
    copy('supabase/upgrade.sql', "(payload->>'size')::integer>", /\(payload->>'size'\)::integer>(\d+)/, int),
    copy('supabase/upgrade.sql', 'message "N MB"', /첨부파일은 (\d+)MB 이하/, mib),
  ]},
  {name: 'attachment base64 cap (chars) = ceil(bytes/3)*4', kind: 'number', copies: [
    copy('server.js', 'content.length>', /content\.length>(\d+)/, int),
    // byte limits are mapped into base64 characters so they are comparable with the cap.
    copy('server.js', 'buffer.length> (bytes)', /buffer\.length>(\d+)/, int, {normalize: base64Of}),
    copy('supabase/kpi.sql', "(payload->>'size')::integer> (bytes)", /\(payload->>'size'\)::integer>(\d+)/, int, {normalize: base64Of}),
  ]},
  {name: 'attachments per task', kind: 'number', copies: [
    copy('kpi-store-local.js', 'task_files count >=', /\.n>=(\d+)\)fail\(/, int),
    copy('kpi-store-local.js', 'message "N개까지"', /업무당 첨부파일은 (\d+)개까지/, int),
    copy('supabase/kpi.sql', 'count(*) >=', /task_files where task_id=t\.id\)>=(\d+)/, int),
    copy('supabase/kpi.sql', 'message "N개까지"', /업무당 첨부파일은 (\d+)개까지/, int),
    copy('supabase/upgrade.sql', 'count(*) >=', /task_files where task_id=t\.id\)>=(\d+)/, int),
    copy('supabase/upgrade.sql', 'message "N개까지"', /업무당 첨부파일은 (\d+)개까지/, int),
  ]},
  {name: 'assignee max length (chars)', kind: 'number', copies: [
    copy('server.js', 'assignee.length>', /assignee\.length>(\d+)/, int),
    copy('server.js', 'message "1~N자"', /담당자를 1~(\d+)자/, int),
    copy('public/kpi-ui.js', 'input maxlength', /name="assignee"[^>]*maxlength="(\d+)"/, int),
    copy('supabase/kpi.sql', 'length(who)>', /length\(who\)>(\d+)/, int),
    copy('supabase/kpi.sql', 'message "1~N자"', /담당자를 1~(\d+)자/, int),
    copy('supabase/upgrade.sql', 'length(who)>', /length\(who\)>(\d+)/, int),
    copy('supabase/upgrade.sql', 'message "1~N자"', /담당자를 1~(\d+)자/, int),
  ]},
];

// ---- real files ----
for (const group of groups) {
  test(`parity: ${group.name}`, () => {
    const report = compareGroup(group, readReal);
    assert.equal(report, null, report || '');
  });
}

// ---- fixtures: the same extractor / compare functions on in-memory text ----
// Prove the checker can fail: one copy changed => mismatch reported; nothing matched => throws.
const memory = files => rel => {
  if (!(rel in files)) throw new Error(`fixture has no file ${rel}`);
  return files[rel];
};
const statusGroup = {name: 'fixture statuses', kind: 'list', copies: [
  copy('a.js', 'const statuses', /const statuses=\[([^\]]*)\]/, quoted),
  copy('b.sql', 'status in', /status in \(([^)]*)\)/, quoted),
]};

test('fixture: equal copies produce no report', () => {
  const files = {'a.js': "x\nconst statuses=['접수','완료']", 'b.sql': "y\nz check(status in ('접수','완료'))"};
  assert.equal(compareGroup(statusGroup, memory(files)), null);
});

test('fixture: one changed copy is reported with group name and file:line of every copy', () => {
  const files = {'a.js': "x\nconst statuses=['접수','완료']", 'b.sql': "y\nz\ncheck(status in ('접수','종료'))"};
  const report = compareGroup(statusGroup, memory(files));
  assert.ok(report, 'divergence must be reported');
  assert.match(report, /fixture statuses/);
  assert.match(report, /a\.js:2 /);
  assert.match(report, /b\.sql:3 /);
});

test('fixture: ordered list - same labels in another order diverge', () => {
  const files = {'a.js': "const statuses=['접수','완료']", 'b.sql': "status in ('완료','접수')"};
  assert.ok(compareGroup(statusGroup, memory(files)));
});

test('fixture: set - same names in another order do NOT diverge, a missing name does', () => {
  const setGroup = {name: 'fixture set', kind: 'set', copies: [
    copy('a.js', 'fields', /fields=\[([^\]]*)\]/, quoted),
    copy('b.sql', 'columns', /tasks\(([^)]*)\)/, columns),
  ]};
  assert.equal(compareGroup(setGroup, memory({'a.js': "fields=['title','due_date']", 'b.sql': 'tasks(due_date,title)'})), null);
  assert.ok(compareGroup(setGroup, memory({'a.js': "fields=['title','due_date']", 'b.sql': 'tasks(title)'})));
});

test('fixture: number normalization - 1MB equals 1048576 bytes, 2MB does not', () => {
  const sizeGroup = {name: 'fixture size', kind: 'number', copies: [
    copy('a.js', 'bytes', /size>(\d+)/, int),
    copy('b.sql', 'MB', /(\d+)MB/, mib),
  ]};
  assert.equal(compareGroup(sizeGroup, memory({'a.js': 'size>1048576', 'b.sql': '1MB'})), null);
  assert.ok(compareGroup(sizeGroup, memory({'a.js': 'size>1048576', 'b.sql': '2MB'})));
  assert.ok(compareGroup(sizeGroup, memory({'a.js': 'size>1048575', 'b.sql': '1MB'})));
});

test('fixture: extractor that matches nothing throws, never passes vacuously', () => {
  const files = {'a.js': 'refactored away', 'b.sql': "status in ('접수','완료')"};
  assert.throws(() => compareGroup(statusGroup, memory(files)), /extractor matched nothing: a\.js const statuses/);
});

test('fixture: extractor whose capture parses to nothing throws', () => {
  const files = {'a.js': 'const statuses=[]', 'b.sql': "status in ('접수')"};
  assert.throws(() => compareGroup(statusGroup, memory(files)), /extractor matched nothing: a\.js const statuses/);
});

test('fixture: unexpected extra copy (match count differs) throws', () => {
  const files = {'a.js': "const statuses=['접수']\nconst statuses=['접수']", 'b.sql': "status in ('접수')"};
  assert.throws(() => compareGroup(statusGroup, memory(files)), /matched 2 times, expected 1: a\.js/);
});

// Every real copy, mutated in memory one at a time, must make its group diverge and be named.
for (const group of groups) {
  test(`fixture: mutating any single copy of "${group.name}" is detected`, () => {
    const entries = extractGroup(group, readReal);
    assert.ok(entries.length >= 2, 'a group needs at least two copies');
    for (const entry of entries) {
      const original = readReal(entry.file);
      const [start, end] = entry.span;
      const captured = original.slice(start, end);
      const mutated = /\d/.test(captured)
        ? captured.replace(/\d/, d => String((Number(d) + 1) % 10))
        : captured.replace(/[A-Za-z가-힣]/, 'Z');
      assert.notEqual(mutated, captured);
      const reader = rel => rel === entry.file ? original.slice(0, start) + mutated + original.slice(end) : readReal(rel);
      const report = compareGroup(group, reader);
      assert.ok(report, `mutating ${entry.file}:${entry.line} (${entry.what}) was not detected`);
      assert.ok(report.includes(`${entry.file}:${entry.line} `), `report does not name ${entry.file}:${entry.line}`);
    }
  });
}
