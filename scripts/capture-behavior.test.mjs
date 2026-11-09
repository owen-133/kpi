import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BACKEND_NORMALIZATIONS, factDiff, firstDifference, normalizeBackendMode, normalizeFactsText, parseArgs} from './capture-behavior.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'capture-behavior.mjs');
const facts = (overrides = {}) => JSON.stringify({
  screen: 'demo',
  variants: {'admin/empty': {opened: true, headings: [{level: 2, text: '제목'}]}, 'viewer/empty': {opened: false}},
  interactions: [{role: 'admin', state: 'populated', action: 'click 닫기', after: ['- dialog']}, {role: 'viewer', state: 'empty', action: 'click 열기', after: 'unchanged'}],
  ...overrides,
}, null, 1) + '\n';

test('parseArgs: --check with --screen is accepted and the target is next; --target next is the same', () => {
  assert.deepEqual(parseArgs(['--check', '--screen', 'settings']), {check: true, screen: 'settings', target: 'next'});
  assert.deepEqual(parseArgs(['--target', 'next', '--check']), {check: true, screen: null, target: 'next'});
});

test('parseArgs: without --check it is refused, because the committed facts are frozen and nothing writes them', () => {
  assert.match(parseArgs([]).error, /frozen.*--check/);
  assert.match(parseArgs(['--target', 'next']).error, /frozen.*--check/);
});

test('parseArgs: an unknown target (the legacy target is gone), an unknown flag and a flag without a value are refused', () => {
  assert.match(parseArgs(['--target', 'prod', '--check']).error, /unknown target "prod"/);
  assert.match(parseArgs(['--target', 'legacy', '--check']).error, /unknown target "legacy"/);
  assert.match(parseArgs(['--bogus']).error, /unknown argument "--bogus"/);
  assert.match(parseArgs(['--target']).error, /needs a value/);
  assert.match(parseArgs(['--screen', '--check']).error, /needs a value/);
});

test('cli: no --check exits 2 with a usage line, writes nothing and runs nothing', () => {
  const result = spawnSync(process.execPath, [script], {encoding: 'utf8', timeout: 20000});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /frozen/);
  assert.match(result.stderr, /usage: node scripts\/capture-behavior\.mjs/);
});

test('cli: an unknown target exits 2', () => {
  const result = spawnSync(process.execPath, [script, '--target', 'prod', '--check'], {encoding: 'utf8', timeout: 20000});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown target "prod"/);
});

test('firstDifference: equal values give null, the first differing path is named, a missing side shows as undefined', () => {
  assert.equal(firstDifference({a: [1, {b: 'x'}]}, {a: [1, {b: 'x'}]}), null);
  assert.deepEqual(firstDifference({a: [1, {b: 'x'}]}, {a: [1, {b: 'y'}]}), {path: '.a[1].b', expected: 'x', actual: 'y'});
  assert.deepEqual(firstDifference({a: [1, 2]}, {a: [1]}), {path: '.a[1]', expected: 2, actual: undefined});
  assert.deepEqual(firstDifference([1], {0: 1}).path, '');
});

test('factDiff: identical text gives null', () => {
  assert.equal(factDiff('demo.facts.json', facts(), facts()), null);
});

test('factDiff: names the screen, the interaction index and the first differing fact, and leaves equal records out', () => {
  const changed = JSON.parse(facts());
  changed.interactions[1].after = ['- button "열기"'];
  const report = factDiff('demo.facts.json', facts(), JSON.stringify(changed, null, 1) + '\n');
  assert.match(report, /demo\.facts\.json: 1 differing record\(s\) of 2 variants \+ 2 interactions/);
  assert.match(report, /demo interaction 1 \(viewer\/empty "click 열기"\)/);
  assert.match(report, /first differing fact: \.after/);
  assert.match(report, /committed: "unchanged"/);
  assert.match(report, /captured:  \["- button \\"열기\\""\]/);
  assert.doesNotMatch(report, /interaction 0/);
  assert.doesNotMatch(report, /variant admin/);
});

test('factDiff: a variant that differs and an interaction that is missing are both reported', () => {
  const changed = JSON.parse(facts());
  changed.variants['admin/empty'].opened = false;
  changed.interactions.pop();
  const report = factDiff('demo.facts.json', facts(), JSON.stringify(changed, null, 1) + '\n');
  assert.match(report, /demo variant admin\/empty/);
  assert.match(report, /first differing fact: \.opened/);
  assert.match(report, /interaction 1 \(viewer\/empty "click 열기"\)/);
  assert.match(report, /captured:  \(missing\)/);
});

test('factDiff: text that is not JSON falls back to a line diff instead of crashing', () => {
  const report = factDiff('demo.facts.json', 'one\ntwo\n', 'one\nTWO\n');
  assert.match(report, /line 2/);
  assert.match(report, /committed: two/);
});

test('the Next app matches the committed facts: --check on one screen exits 0', {timeout: 900000}, (t) => {
  if (!process.env.ORBIT_PLAYWRIGHT_PATH || !process.env.CHROMIUM_PATH) return t.skip('browser environment missing (eval "$(node scripts/env-for-tests.mjs)")');
  if (process.env.ORBIT_UI_USE_BUILD !== '1') return t.skip('set ORBIT_UI_USE_BUILD=1 to serve the existing web/.next build instead of building one');
  const result = spawnSync(process.execPath, [script, '--check', '--screen', 'settings'], {encoding: 'utf8', timeout: 800000});
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`.slice(-3000));
  assert.match(result.stdout, /behavior facts match/);
});

// backend-mode normalization table ------------------------------------------------------------
const timeline = (actor, kind, detail) => [`  - text: <TS> · ${actor}`, `  - strong: ${kind}`, `  - paragraph: ${detail}`];
const wrap = (lines) => ({variants: {v: {tree: lines}}, interactions: []});
const norm = (lines) => normalizeBackendMode(wrap(lines)).variants.v.tree;

test('backend table: every entry names a reason and evidence, and is global (applies to every occurrence)', () => {
  assert.ok(BACKEND_NORMALIZATIONS.length > 0);
  for (const e of BACKEND_NORMALIZATIONS) {
    assert.ok(e.pattern instanceof RegExp && e.pattern.global, 'global pattern');
    assert.equal(typeof e.replacement, 'string');
    assert.match(e.reason, /\S{3}/);
    assert.match(e.evidence, /\.(js|sql):\d+/); // cites files of the old portal and the supabase sources
  }
});

test('backend table: the legacy local actor of an admin-recorded kind becomes admin, the Next line is unchanged', () => {
  for (const kind of ['담당자 배정', '업무 정보 수정', '업무 삭제', '업무 복원', '데이터 구분 변경', '첨부파일 등록', '첨부파일 삭제']) {
    assert.deepEqual(norm(timeline('총무 담당자', kind, 'x')), timeline('admin', kind, 'x'), kind);
    assert.deepEqual(norm(timeline('admin', kind, 'x')), timeline('admin', kind, 'x'), kind);
  }
});

test('backend table: kinds that keep the default actor in Supabase stay 총무 담당자 on both sides', () => {
  for (const kind of ['등록', '상태 변경', '처리 메모']) assert.deepEqual(norm(timeline('총무 담당자', kind, 'x')), timeline('총무 담당자', kind, 'x'), kind);
  assert.notDeepEqual(norm(timeline('admin', '처리 메모', 'x')), norm(timeline('총무 담당자', '처리 메모', 'x')));
});

test('backend table: a different actor string is not normalized, so factDiff still fails on it', () => {
  const a = norm(timeline('총무 담당자', '담당자 배정', '박지원'));
  const b = norm(timeline('김철수', '담당자 배정', '박지원'));
  assert.notDeepEqual(a, b);
  const text = (lines) => JSON.stringify(wrap(lines), null, 1);
  assert.match(factDiff('x', normalizeFactsText(text(timeline('총무 담당자', '담당자 배정', '박지원'))), normalizeFactsText(text(timeline('김철수', '담당자 배정', '박지원')))), /first differing fact/);
});

test('backend table: the assign line drops the old assignee, and only on a 담당자 배정 line', () => {
  assert.deepEqual(norm(timeline('admin', '담당자 배정', '미배정 → 박지원')), timeline('admin', '담당자 배정', '박지원'));
  assert.deepEqual(norm(timeline('admin', '담당자 배정', '김하나 → 박지원')), timeline('admin', '담당자 배정', '박지원'));
  assert.deepEqual(norm(timeline('총무 담당자', '상태 변경', '접수 → 진행 중')), timeline('총무 담당자', '상태 변경', '접수 → 진행 중'));
  assert.notDeepEqual(norm(timeline('admin', '담당자 배정', '미배정 → 박지원')), norm(timeline('admin', '담당자 배정', '박지원 → 김하나')));
});

test('backend table: priority and due date in the edit detail get one order; other texts are untouched', () => {
  const legacy = ['  - paragraph: "수정 사유: 기한 변경 중요도: 높음 → 하 처리 기한: 2026-11-05 → 2026-11-12"'];
  const next = ['  - paragraph: "수정 사유: 기한 변경 처리 기한: 2026-11-05 → 2026-11-12 중요도: 높음 → 하"'];
  assert.deepEqual(norm(legacy), norm(next));
  const other = ['  - paragraph: "수정 사유: 수량 정정 업무명: 신규 입사자 노트북 준비 → 신규 입사자 노트북 2대 준비"'];
  assert.deepEqual(norm(other), other);
  const differentValue = ['  - paragraph: "수정 사유: 기한 변경 처리 기한: 2026-11-05 → 2026-11-13 중요도: 높음 → 하"'];
  assert.notDeepEqual(norm(legacy), norm(differentValue));
});

test('backend table: non-snapshot facts and non-JSON text pass through unchanged', () => {
  const value = {variants: {v: {opened: true, buttons: [{name: '총무 담당자'}]}}, interactions: [{note: 'unchanged'}]};
  assert.deepEqual(normalizeBackendMode(value), value);
  assert.equal(normalizeFactsText('not json'), 'not json');
});
