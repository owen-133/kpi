// Quotes requirement ids as examples, not as proof tags: loadRealCorpus leaves this file out of the tag scan (TAG_EXAMPLE_SPECS).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { showRequirements } from '../scripts/ssot-show.ts';
import { parseRequirements, SSOT_PATH } from './ssot.helpers.ts';

const REPO = path.resolve(import.meta.dirname, '..', '..');
const SCRIPT = path.join(REPO, 'web', 'scripts', 'ssot-show.ts');

const SAMPLE = [
  '# Title', //                                     1
  '', //                                            2
  '## Core', //                                     3
  '', //                                            4
  '### R-001 First one', //                         5
  'layer: core', //                                 6
  'status: current', //                             7
  'home: web/src/request', //                       8
  '', //                                            9
  '```', //                                        10
  '### R-099 not a heading, it sits in a fence', // 11
  '```', //                                        12
  '### R-002 Dropped one', //                      13
  'layer: out', //                                 14
  'status: dropped', //                            15
  '## Next section', //                            16
  '### R-003 Last one', //                         17
  'layer: supporting', //                          18
  'status: planned', //                            19
].join('\n');

function show(text: string, ...argv: string[]) {
  return showRequirements(text, argv);
}

describe('ssot-show formatting', () => {
  it('index: one line per requirement with start-end status layer home, home - when absent', () => {
    const r = show(SAMPLE);
    assert.equal(r.code, 0);
    assert.deepStrictEqual(r.stdout, [
      'R-001 5-12 current core web/src/request',
      'R-002 13-15 dropped out -',
      'R-003 17-19 planned supporting -',
    ]);
  });

  it('block: the first requirement ends at the line before the next heading and a fenced heading does not split it', () => {
    assert.deepStrictEqual(show(SAMPLE, 'R-001').stdout, SAMPLE.split('\n').slice(4, 12));
  });

  it('block: a dropped requirement prints, ending at a section heading', () => {
    const r = show(SAMPLE, 'R-002');
    assert.equal(r.code, 0);
    assert.deepStrictEqual(r.stdout, ['### R-002 Dropped one', 'layer: out', 'status: dropped']);
  });

  it('block: the last requirement runs to the end of the text with or without a final newline', () => {
    const expected = ['### R-003 Last one', 'layer: supporting', 'status: planned'];
    assert.deepStrictEqual(show(SAMPLE, 'R-003').stdout, expected);
    assert.deepStrictEqual(show(`${SAMPLE}\n`, 'R-003').stdout, expected);
    assert.equal(show(`${SAMPLE}\n`).stdout[2], 'R-003 17-19 planned supporting -');
  });

  it('unknown id R-999 exits 1 and says so on stderr', () => {
    const r = show(SAMPLE, 'R-999');
    assert.equal(r.code, 1);
    assert.deepStrictEqual(r.stdout, []);
    assert.match(r.stderr.join('\n'), /R-999/);
  });

  it('usage errors exit 2: malformed ids and more than one argument', () => {
    for (const argv of [['r-1'], ['R-1'], ['R-0010'], ['001'], ['R-001', 'R-002'], ['']]) {
      const r = showRequirements(SAMPLE, argv);
      assert.equal(r.code, 2, JSON.stringify(argv));
      assert.deepStrictEqual(r.stdout, []);
    }
  });

  it('fenced heading R-099 is not listed', () => {
    assert.ok(!show(SAMPLE).stdout.some((l) => l.startsWith('R-099')));
    assert.equal(show(SAMPLE, 'R-099').code, 1);
  });
});

describe('ssot-show on the real requirements file', () => {
  const text = fs.readFileSync(path.join(REPO, SSOT_PATH), 'utf8');
  const reqs = parseRequirements(text);
  const range = (line: string): [number, number] => {
    const m = /^R-\d+ (\d+)-(\d+) /.exec(line);
    assert.ok(m, line);
    return [Number(m[1]), Number(m[2])];
  };

  it('index lists every requirement in file order, first and last included', () => {
    const index = show(text).stdout;
    assert.equal(index.length, reqs.length);
    assert.ok(index[0].startsWith('R-001 '));
    assert.ok(index[index.length - 1].startsWith(`${reqs[reqs.length - 1].id} `));
  });

  it('block text equals the sed range of its index line for every requirement', () => {
    const fileLines = text.split('\n');
    for (const line of show(text).stdout) {
      const id = line.slice(0, 5);
      const [start, end] = range(line);
      assert.deepStrictEqual(show(text, id).stdout, fileLines.slice(start - 1, end), id);
      assert.ok(fileLines[start - 1].startsWith(`### ${id}`), id);
    }
  });

  it('the dropped requirement R-014 prints its block', () => {
    const r014 = reqs.find((r) => r.id === 'R-014');
    assert.equal(r014?.status, 'dropped');
    const r = show(text, 'R-014');
    assert.equal(r.code, 0);
    assert.ok(r.stdout[0].startsWith('### R-014'));
  });
});

describe('ssot-show script', () => {
  const run = (...argv: string[]) => spawnSync(process.execPath, [SCRIPT, ...argv], { cwd: REPO, encoding: 'utf8' });

  it('exits 0 with the index, 0 with a block, 1 for R-999, 2 for r-1 and for two arguments, and writes nothing', () => {
    const before = fs.readFileSync(path.join(REPO, SSOT_PATH), 'utf8');
    const index = run();
    assert.equal(index.status, 0, index.stderr);
    assert.equal(index.stdout.trimEnd().split('\n').length, parseRequirements(before).length);
    const block = run('R-001');
    assert.equal(block.status, 0, block.stderr);
    assert.ok(block.stdout.startsWith('### R-001 '));
    const unknown = run('R-999');
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /R-999/);
    assert.equal(unknown.stdout, '');
    assert.equal(run('r-1').status, 2);
    assert.equal(run('R-001', 'R-002').status, 2);
    assert.equal(fs.readFileSync(path.join(REPO, SSOT_PATH), 'utf8'), before);
  });
});
