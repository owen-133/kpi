import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareDomFacts, diffPixels, normalizeAria, parseArgs, SCREENS} from './compare-screens.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const solid = (w, h, rgba) => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) out.set(rgba, i * 4);
  return out;
};

test('diffPixels: identical images have ratio 0 and no marked pixel', () => {
  const a = solid(4, 2, [10, 20, 30, 255]);
  const result = diffPixels(a, solid(4, 2, [10, 20, 30, 255]), 4, 2);
  assert.equal(result.count, 0);
  assert.equal(result.ratio, 0);
  assert.equal(result.diff.length, 4 * 2 * 4);
  for (let i = 0; i < 8; i++) assert.notDeepEqual([...result.diff.slice(i * 4, i * 4 + 4)], [255, 0, 0, 255]);
});

test('diffPixels: a channel delta over 24 counts, exactly 24 does not (boundary)', () => {
  const base = solid(2, 2, [100, 100, 100, 255]);
  const at24 = solid(2, 2, [100, 100, 100, 255]);
  at24[0] = 124;
  assert.equal(diffPixels(base, at24, 2, 2).count, 0);
  const at25 = solid(2, 2, [100, 100, 100, 255]);
  at25[0] = 125;
  assert.equal(diffPixels(base, at25, 2, 2).count, 1);
});

test('diffPixels: ratio is differing pixels over all pixels and the diff image marks them red', () => {
  const a = solid(5, 2, [255, 255, 255, 255]);
  const b = solid(5, 2, [255, 255, 255, 255]);
  b.set([0, 0, 0, 255], 3 * 4);
  b.set([0, 0, 0, 255], 7 * 4);
  const result = diffPixels(a, b, 5, 2);
  assert.equal(result.count, 2);
  assert.equal(result.ratio, 0.2);
  assert.deepEqual([...result.diff.slice(3 * 4, 3 * 4 + 4)], [255, 0, 0, 255]);
  assert.deepEqual([...result.diff.slice(7 * 4, 7 * 4 + 4)], [255, 0, 0, 255]);
});

test('diffPixels: the alpha channel counts (padding for a shorter page differs from content)', () => {
  const a = solid(1, 1, [255, 255, 255, 255]);
  const b = solid(1, 1, [0, 0, 0, 0]);
  assert.equal(diffPixels(a, b, 1, 1).count, 1);
});

test('diffPixels: refuses buffers that do not match width x height', () => {
  assert.throws(() => diffPixels(solid(2, 2, [0, 0, 0, 255]), solid(2, 1, [0, 0, 0, 255]), 2, 2), /length/);
});

const snapshot = `- banner:
  - link "아이지넷":
    - /url: /
- navigation:
  - button "▦ Overview"
  - button "☷ 업무 보드"
- main:
  - heading "좋은 하루예요" [level=1]
  - button "＋ 새 업무 등록"
`;

test('normalizeAria: drops refs, cursor and active noise but keeps roles, names and states', () => {
  const noisy = snapshot
    .replace('button "＋ 새 업무 등록"', 'button "＋ 새 업무 등록" [ref=e12] [cursor=pointer] [active]')
    .replace('button "☷ 업무 보드"', 'button "☷ 업무 보드" [disabled]');
  const lines = normalizeAria(noisy);
  assert.ok(lines.includes('  - button "＋ 새 업무 등록"'));
  assert.ok(lines.some((l) => l.endsWith('button "☷ 업무 보드" [disabled]')));
  assert.ok(!lines.some((l) => /ref=|cursor=|\[active\]/.test(l)));
});

test('compareDomFacts: same facts are equal even when only noise differs', () => {
  const result = compareDomFacts(snapshot, snapshot.replace('"＋ 새 업무 등록"', '"＋ 새 업무 등록" [ref=e3] [cursor=pointer]'));
  assert.equal(result.equal, true);
  assert.deepEqual(result.diff, []);
});

test('compareDomFacts: a changed label is reported with both texts', () => {
  const result = compareDomFacts(snapshot, snapshot.replace('새 업무 등록', '새 요청 등록'));
  assert.equal(result.equal, false);
  assert.ok(result.diff.some((l) => l.startsWith('- ') && l.includes('새 업무 등록')));
  assert.ok(result.diff.some((l) => l.startsWith('+ ') && l.includes('새 요청 등록')));
});

test('compareDomFacts: reordered, missing and disabled differences are all unequal', () => {
  const reordered = snapshot.replace('  - button "▦ Overview"\n  - button "☷ 업무 보드"', '  - button "☷ 업무 보드"\n  - button "▦ Overview"');
  assert.equal(compareDomFacts(snapshot, reordered).equal, false);
  assert.equal(compareDomFacts(snapshot, snapshot.replace('  - button "☷ 업무 보드"\n', '')).equal, false);
  const disabled = compareDomFacts(snapshot, snapshot.replace('button "＋ 새 업무 등록"', 'button "＋ 새 업무 등록" [disabled]'));
  assert.equal(disabled.equal, false);
  assert.ok(disabled.diff.some((l) => l.includes('[disabled]')));
});

test('compareDomFacts: a repeated row count difference is caught', () => {
  const rows = (n) => `- list:\n${'  - listitem: 업무\n'.repeat(n)}`;
  assert.equal(compareDomFacts(rows(3), rows(3)).equal, true);
  assert.equal(compareDomFacts(rows(3), rows(4)).equal, false);
});

test('parseArgs: defaults, flags and rejected input', () => {
  const ok = parseArgs(['--screen', 'board', '--self-test']);
  assert.equal(ok.screen, 'board');
  assert.equal(ok.selfTest, true);
  assert.equal(ok.threshold, 0.005);
  assert.equal(parseArgs(['--screen', 'detail', '--start', '--threshold-pixel', '0.01']).threshold, 0.01);
  assert.throws(() => parseArgs([]), /--screen/);
  assert.throws(() => parseArgs(['--screen', 'nope', '--start']), /unknown screen/);
  assert.throws(() => parseArgs(['--screen', 'board']), /--start|--legacy-url/);
  assert.throws(() => parseArgs(['--screen', 'board', '--legacy-url', 'http://x']), /--next-url/);
  assert.throws(() => parseArgs(['--screen', 'board', '--self-test', '--threshold-pixel', 'abc']), /threshold/);
  assert.throws(() => parseArgs(['--screen', 'board', '--self-test', '--bogus']), /unknown option/);
});

test('SCREENS: every required screen id is in the table', () => {
  for (const id of ['overview', 'board', 'report', 'improvement', 'create', 'improvement-dialog', 'trash', 'settings', 'edit-task', 'detail']) {
    assert.equal(typeof SCREENS[id]?.reach, 'function', id);
  }
});

test('compare-screens --self-test overview: legacy against itself has zero diff in all 8 shots',
  {skip: process.env.ORBIT_PLAYWRIGHT_PATH ? false : 'ORBIT_PLAYWRIGHT_PATH is unset (run: eval "$(node scripts/env-for-tests.mjs)")', timeout: 280000},
  () => {
    const run = spawnSync(process.execPath, ['scripts/compare-screens.mjs', '--screen', 'overview', '--self-test'], {cwd: root, encoding: 'utf8', env: process.env, timeout: 270000});
    assert.equal(run.status, 0, `exit ${run.status}\n${run.stdout}\n${run.stderr}`);
    const reportPath = join(root, 'scratch/compare/overview/report.json');
    assert.ok(existsSync(reportPath), 'report.json missing');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    assert.equal(report.screen, 'overview');
    assert.equal(report.pass, true);
    assert.equal(report.shots.length, 8);
    for (const shot of report.shots) {
      assert.equal(shot.pixelRatio, 0, shot.name);
      assert.equal(shot.domEqual, true, shot.name);
    }
    assert.ok(existsSync(join(root, 'scratch/compare/overview/side-by-side.html')));
  });
