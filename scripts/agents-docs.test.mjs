// Tests for scripts/agents-docs.mjs. Run: node --test scripts/agents-docs.test.mjs
// Every fixture is a throw-away temp tree; each rule has a firing case and a paired non-firing case.
// untested: a chain deeper than root + one subdirectory, and Windows path separators.
import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {check, journalFindings, normalizeLine} from './agents-docs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'agents-docs-test-')));
after(() => rmSync(sandbox, {recursive: true, force: true}));

let counter = 0;
// Builds a tree from {relativePath: content}; AGENTS.md directories get their CLAUDE.md stub unless listed.
function tree(files, {stubs = true} = {}) {
  const root = join(sandbox, `case-${counter++}`);
  const all = {...files};
  if (stubs) for (const path of Object.keys(files)) if (path.endsWith('AGENTS.md')) all[path.replace(/AGENTS\.md$/, 'CLAUDE.md')] ??= '@AGENTS.md\n';
  mkdirSync(root, {recursive: true});
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), {recursive: true});
    writeFileSync(join(root, path), content);
  }
  return root;
}
const cli = (root, ...extra) => spawnSync('node', [join(here, 'agents-docs.mjs'), '--root', root, ...extra], {encoding: 'utf8'});
const rules = (root) => check(root).violations.map((v) => v.rule);
const LONG = '이 문장은 서른 바이트를 넘기는 충분히 긴 규칙 한 줄이다';

test('S1: a chain of 32767 bytes passes and 32768 fails, summed across root and subdirectory', () => {
  assert.deepEqual(rules(tree({'AGENTS.md': 'x'.repeat(32767)})), []);
  assert.deepEqual(rules(tree({'AGENTS.md': 'x'.repeat(32768)})), ['S1']);
  const split = (a, b) => tree({'AGENTS.md': 'a'.repeat(a), 'web/AGENTS.md': 'b'.repeat(b)});
  assert.deepEqual(rules(split(20000, 12767)), []);
  const bad = check(split(20000, 12768));
  assert.deepEqual(bad.violations.map((v) => v.rule), ['S1']);
  assert.equal(bad.violations[0].file, 'web/AGENTS.md');
});

test('S1: a big sibling does not count toward another directory chain', () => {
  const root = tree({'AGENTS.md': 'r'.repeat(10000), 'a/AGENTS.md': 'a'.repeat(20000), 'b/AGENTS.md': 'b'.repeat(20000)});
  assert.deepEqual(rules(root), []);
});

test('--report prints one row per AGENTS.md directory with the chain bytes', () => {
  const root = tree({'AGENTS.md': 'r'.repeat(100), 'web/AGENTS.md': 'w'.repeat(50)});
  const r = cli(root, '--report');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /^dir\s+\| files \| bytes/m);
  assert.match(r.stdout, /^\.\s+\|\s+1 \|\s+100$/m);
  assert.match(r.stdout, /^web\s+\|\s+2 \|\s+150$/m);
});

test('S2: a line in two files of one chain fails; the same line in unrelated directories passes', () => {
  const dup = tree({'AGENTS.md': `${LONG}\n`, 'web/AGENTS.md': `- ${LONG}\n`});
  const v = check(dup).violations;
  assert.deepEqual(v.map((x) => `${x.rule} ${x.file}:${x.line}`), ['S2 web/AGENTS.md:1']);
  const unrelated = tree({'AGENTS.md': 'root only text that is unique and long enough here\n', 'a/AGENTS.md': `${LONG}\n`, 'b/AGENTS.md': `| ${LONG}\n`});
  assert.deepEqual(rules(unrelated), []);
});

test('S2: a chain line repeated in docs/architecture.md fails; short lines, headings, table rules and fenced code do not count', () => {
  const root = tree({'AGENTS.md': `${LONG}\n`, 'docs/architecture.md': `# T\n${LONG}\n`});
  assert.deepEqual(rules(root), ['S2']);
  const skipped = '# 이 제목은 서른 바이트를 넘기는 충분히 긴 제목이다 제목\n|---|---|---|---|---|---|---|---|---|---|---|---|\nshort line\n```\n' + LONG + '\n```\n';
  assert.deepEqual(rules(tree({'AGENTS.md': skipped, 'web/AGENTS.md': skipped, 'docs/architecture.md': skipped})), []);
  assert.equal(normalizeLine('- short'), null);
  assert.equal(normalizeLine(`| ${LONG}`), LONG);
});

test('S3: a missing or wrong CLAUDE.md fails; the exact stub passes; the repo root is covered too', () => {
  assert.deepEqual(rules(tree({'AGENTS.md': 'x\n', 'web/AGENTS.md': 'y\n'})), []);
  assert.deepEqual(rules(tree({'AGENTS.md': 'x\n', 'web/AGENTS.md': 'y\n'}, {stubs: false})), ['S3', 'S3']);
  const wrong = check(tree({'AGENTS.md': 'x\n', 'CLAUDE.md': '@AGENTS.md', 'web/AGENTS.md': 'y\n', 'web/CLAUDE.md': '@AGENTS.md\n\n'}));
  assert.deepEqual(wrong.violations.map((v) => `${v.rule} ${v.file}`), ['S3 CLAUDE.md', 'S3 web/CLAUDE.md']);
  assert.deepEqual(rules(tree({'AGENTS.md': 'x\n', 'CLAUDE.md': '# a different file\n@AGENTS.md\n'})), ['S3']);
});

const journal = (text) => journalFindings(text).map((f) => `${f.rule}@${f.line}`);

test('J1: a dated heading fires, an undated one and a dated body line do not', () => {
  assert.deepEqual(journal('## 2026-11-10 정리\n'), ['J1@1']);
  assert.deepEqual(journal('### 회차 2026.11\n'), ['J1@1']);
  assert.deepEqual(journal('## 정리 절차\n기준일은 2026-11-10 이다\n'), []);
});

test('J2: before/now narrative on one line fires, either half alone does not', () => {
  assert.deepEqual(journal('기존에는 수동이었는데 이번에 자동으로 바꿨다 그래서 맞다\n'), ['J2@1']);
  assert.deepEqual(journal('previously a script, now a hook\n'), ['J2@1']);
  assert.deepEqual(journal('기존에는 수동이다\n이번에 자동이다\n'), []);
});

test('J3: a line ending in a past-tense verb fires, a present-tense one does not', () => {
  assert.deepEqual(journal('검사를 추가했다.\n'), ['J3@1']);
  assert.deepEqual(journal('원인을 찾았었다\n'), ['J3@1']);
  assert.deepEqual(journal('검사를 추가한다.\n그때 했다고 적지 않는다\n'), []);
});

test('J4: a dated bullet fires, a bullet with the date later in the line does not', () => {
  assert.deepEqual(journal('- 2026-11-10 바뀜\n'), ['J4@1']);
  assert.deepEqual(journal('* 2026-11-10\n'), ['J4@1']);
  assert.deepEqual(journal('- 기준일 2026-11-10\n'), []);
});

test('J*: fenced code and inline code spans are ignored', () => {
  assert.deepEqual(journal('```\n## 2026-11-10 x\n- 2026-11-10 y\n검사를 추가했다.\n```\n'), []);
  assert.deepEqual(journal('쓰는 값은 `- 2026-11-10 했다` 이다\n'), []);
  assert.deepEqual(journal('```\nopen\n검사를 추가했다.\n'), [], 'an unclosed fence hides the rest');
});

test('J*: real accept lines of R-017 and R-034 do not fire, and the accept exemption is what protects them', () => {
  const r017 = '- Given `YYYY-MM` 형식이 아니거나 없는 달(`2026-13`) / When 그 월로 지표를 요청하면 / Then 400 `조회 월을 확인하세요.` 로 거절한다';
  const r034 = '- Given 어제 요청하고 오늘 완료한 업무 / When 기본 날짜별 보드를 보면 / Then 한국 시간의 오늘 완료일 그룹과 기간 검색에 포함된다';
  assert.deepEqual(journal(`${r017}\n${r034}\n`), []);
  assert.deepEqual(journal('accept: Given 어제 완료한 업무 / Then 완료했다\n'), []);
  assert.deepEqual(journal('- Given 어제 완료한 업무 / Then 기록했다\n'), []);
  assert.deepEqual(journal('- 어제 완료한 업무를 기록했다\n'), ['J3@1'], 'the same sentence without Given fires');
  assert.deepEqual(journal('- 2026-11-10 Given a thing\n'), ['J4@1'], 'a dated bullet is not an accept line');
});

test('J*: scanned files are chain docs, docs/**/*.md, .codex toml and DEPLOY.md; CHANGELOG.md and fixtures are exempt', () => {
  const bad = '## 2026-11-10 x\n';
  const root = tree({
    'AGENTS.md': 'clean\n',
    'docs/a.md': bad,
    'docs/sub/b.md': bad,
    'docs/CHANGELOG.md': bad,
    '.codex/agents/x.toml': `${bad}`,
    'DEPLOY.md': bad,
    'web/ssot-fixtures/f/AGENTS.md': bad,
    'web/arch-fixtures/f/AGENTS.md': bad,
    'node_modules/p/AGENTS.md': bad,
    'README.md': bad,
  });
  assert.deepEqual(check(root).violations.map((v) => v.file).sort(), ['.codex/agents/x.toml', 'DEPLOY.md', 'docs/a.md', 'docs/sub/b.md']);
  assert.deepEqual(rules(tree({'AGENTS.md': bad})), ['J1']);
  assert.deepEqual(rules(tree({'AGENTS.md': 'x\n', 'CLAUDE.md': '@AGENTS.md\n'})), []);
});

test('J*: requirements.md is scanned only above its first R- block', () => {
  const body = '### R-001 제목\n- 2026-11-10 증거\n검사를 추가했다.\n';
  assert.deepEqual(rules(tree({'AGENTS.md': 'x\n', 'docs/ssot/requirements.md': `# 정본\n\n${body}`})), []);
  const header = tree({'AGENTS.md': 'x\n', 'docs/ssot/requirements.md': `# 정본\n검사를 추가했다.\n\n${body}`});
  assert.deepEqual(check(header).violations.map((v) => `${v.rule}@${v.line}`), ['J3@2']);
});

test('CLI: exit 0 on a clean tree, 1 with file:line and rule on a planted violation, 2 on setup errors', () => {
  const clean = cli(tree({'AGENTS.md': '현재 상태를 적는다\n'}));
  assert.equal(clean.status, 0, clean.stdout);
  const planted = cli(tree({'AGENTS.md': '현재 상태를 적는다\n- 2026-11-10 추가\n'}));
  assert.equal(planted.status, 1);
  assert.match(planted.stdout, /^AGENTS\.md:2 J4 /m);
  const noRoot = cli(tree({'docs/a.md': 'x\n'}));
  assert.equal(noRoot.status, 2);
  assert.match(noRoot.stderr, /AGENTS\.md not found/);
  assert.equal(cli(join(sandbox, 'nope')).status, 2);
  assert.equal(spawnSync('node', [join(here, 'agents-docs.mjs'), '--bogus'], {encoding: 'utf8'}).status, 2);
  assert.equal(spawnSync('node', [join(here, 'agents-docs.mjs'), '--root'], {encoding: 'utf8'}).status, 2);
});
