import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {factDiff, firstDifference, parseArgs} from './capture-behavior.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'capture-behavior.mjs');
const facts = (overrides = {}) => JSON.stringify({
  screen: 'demo',
  variants: {'admin/empty': {opened: true, headings: [{level: 2, text: '제목'}]}, 'viewer/empty': {opened: false}},
  interactions: [{role: 'admin', state: 'populated', action: 'click 닫기', after: ['- dialog']}, {role: 'viewer', state: 'empty', action: 'click 열기', after: 'unchanged'}],
  ...overrides,
}, null, 1) + '\n';

test('parseArgs: no arguments is the legacy capture that writes', () => {
  assert.deepEqual(parseArgs([]), {check: false, screen: null, target: 'legacy'});
});

test('parseArgs: --target next with --check and --screen is accepted', () => {
  assert.deepEqual(parseArgs(['--target', 'next', '--check', '--screen', 'settings']), {check: true, screen: 'settings', target: 'next'});
});

test('parseArgs: --target next without --check is refused (next never writes facts), legacy without --check is not', () => {
  assert.match(parseArgs(['--target', 'next']).error, /never writes facts.*--check/);
  assert.equal(parseArgs(['--target', 'legacy']).error, undefined);
});

test('parseArgs: an unknown target, an unknown flag and a flag without a value are refused', () => {
  assert.match(parseArgs(['--target', 'prod', '--check']).error, /unknown target "prod"/);
  assert.match(parseArgs(['--bogus']).error, /unknown argument "--bogus"/);
  assert.match(parseArgs(['--target']).error, /needs a value/);
  assert.match(parseArgs(['--screen', '--check']).error, /needs a value/);
});

test('cli: --target next without --check exits 2 with a usage line and runs nothing', () => {
  const result = spawnSync(process.execPath, [script, '--target', 'next'], {encoding: 'utf8', timeout: 20000});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /never writes facts/);
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

test('legacy capture is unchanged: --check against the committed facts exits 0', {timeout: 900000}, (t) => {
  if (!process.env.ORBIT_PLAYWRIGHT_PATH || !process.env.CHROMIUM_PATH) return t.skip('browser environment missing (eval "$(node scripts/env-for-tests.mjs)")');
  const result = spawnSync(process.execPath, [script, '--check', '--screen', 'settings'], {encoding: 'utf8', timeout: 800000});
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`.slice(-3000));
  assert.match(result.stdout, /behavior facts match/);
});
