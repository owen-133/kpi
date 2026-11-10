// Keeps docs/ssot/requirements.md consistent with the tests. Checking functions live in ssot.helpers.ts.
// Rules C1..C7 are described there. Fixtures under web/ssot-fixtures/<case>/ prove each rule fires.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planRepins } from '../scripts/ssot-repin.ts';
import {
  checkAll,
  checkEvidence,
  formatViolations,
  loadFixtureCorpus,
  loadRealCorpus,
  parseRequirements,
  unclaimedGoldenLabels,
  type RuleCode,
} from './ssot.helpers.ts';

const SRC = import.meta.dirname;
const REPO = path.resolve(SRC, '..', '..');
const FIXTURES = path.resolve(SRC, '..', 'ssot-fixtures');
// Golden labels come from the committed recordings and the request corpus; fixtures read the real ones from the repository.
const GOLDEN = REPO;

// Each violation fixture breaks exactly one rule; needle is a word that must appear in the message.
const VIOLATION_FIXTURES: { dir: string; code: RuleCode; needle: string }[] = [
  { dir: 'c1-gap', code: 'C1', needle: 'R-003' },
  { dir: 'c1-repeat', code: 'C1', needle: 'R-001' },
  { dir: 'c1-empty', code: 'C1', needle: 'zero requirements' },
  { dir: 'c2-bad-layer', code: 'C2', needle: 'central' },
  { dir: 'c2-bad-status', code: 'C2', needle: 'done' },
  { dir: 'c3-no-accept', code: 'C3', needle: 'accept' },
  { dir: 'c3-no-proof', code: 'C3', needle: 'proof' },
  { dir: 'c3-unknown-golden', code: 'C3', needle: 'secured/no-such-label' },
  { dir: 'c3-unknown-test-name', code: 'C3', needle: 'this title is nowhere' },
  { dir: 'c4-missing-file', code: 'C4', needle: 'no-such-file.ts' },
  { dir: 'c4-line-beyond', code: 'C4', needle: 'beyond' },
  { dir: 'c4-anchor-missing-literal', code: 'C4', needle: 'const gamma = 3;' },
  { dir: 'c4-anchor-moved', code: 'C4', needle: 'tests.txt:3' },
  { dir: 'c5-unknown-tag', code: 'C5', needle: 'R-007' },
  { dir: 'c5-planned-tag', code: 'C5', needle: 'planned' },
  { dir: 'c5-dropped-tag', code: 'C5', needle: 'dropped' },
  { dir: 'c6-title-in-docs', code: 'C6', needle: 'Register a request' },
  { dir: 'c6-no-agents-mention', code: 'C6', needle: 'docs/ssot/requirements.md' },
  { dir: 'c7-home-missing', code: 'C7', needle: 'R-033' },
  { dir: 'c7-home-bad-path', code: 'C7', needle: 'web/src/nowhere/domain' },
];
const CLEAN_FIXTURES = ['clean', 'clean-markdown-variants', 'clean-test-name-with-key-word', 'c4-anchor-clean', 'c7-home-clean'];
// Tree fixtures are miniature repositories read by loadRealCorpus (AGENTS.md, README.md, docs/**, test/golden).
// README.md is upstream product documentation, so a title that only README.md contains is not a C6 violation.
const TREE_CLEAN_FIXTURES = ['tree-title-only-in-readme'];
// A nested AGENTS.md that mentions only ids is clean and still scanned; one that restates a title fires C6.
const TREE_NESTED_CLEAN_FIXTURE = 'tree-nested-agents-ids-only';
const TREE_VIOLATION_FIXTURES: { dir: string; code: RuleCode; needle: string }[] = [
  { dir: 'tree-title-in-docs-file', code: 'C6', needle: 'docs/notes.md' },
  { dir: 'tree-title-in-nested-agents', code: 'C6', needle: 'web/AGENTS.md' },
];

function fixtureViolations(dir: string) {
  const { corpus, requirements } = loadFixtureCorpus(path.join(FIXTURES, dir), GOLDEN);
  return checkAll(requirements, corpus);
}

describe('ssot checks fire on violation fixtures and pass on clean ones', () => {
  it('fixture: every directory under ssot-fixtures is declared here and every declared one exists', () => {
    const onDisk = fs.readdirSync(FIXTURES, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const declared = [
      ...VIOLATION_FIXTURES.map((f) => f.dir),
      ...CLEAN_FIXTURES,
      ...TREE_CLEAN_FIXTURES,
      TREE_NESTED_CLEAN_FIXTURE,
      ...TREE_VIOLATION_FIXTURES.map((f) => f.dir),
    ].sort();
    assert.deepStrictEqual(onDisk, declared);
  });

  it('fixture: the golden label used by the clean fixtures exists in the real golden file', () => {
    const { corpus } = loadFixtureCorpus(path.join(FIXTURES, 'clean'), GOLDEN);
    assert.ok(corpus.goldenLabels.has('secured/health'), 'secured/health missing from the recordings and test/golden/requests.js');
    assert.ok(!corpus.goldenLabels.has('secured/no-such-label'));
  });

  for (const { dir, code, needle } of VIOLATION_FIXTURES) {
    it(`fixture: ${dir} fires ${code} and no other rule`, () => {
      const violations = fixtureViolations(dir);
      assert.deepStrictEqual([...new Set(violations.map((v) => v.code))], [code], formatViolations(violations));
      assert.ok(
        violations.some((v) => v.message.includes(needle)),
        `no ${code} message mentions '${needle}'; got:\n${formatViolations(violations)}`,
      );
    });
  }

  for (const dir of CLEAN_FIXTURES) {
    it(`fixture: ${dir} passes every rule`, () => {
      const violations = fixtureViolations(dir);
      assert.strictEqual(violations.length, 0, formatViolations(violations));
    });
  }

  for (const dir of TREE_CLEAN_FIXTURES) {
    it(`fixture: ${dir} passes every rule and README.md is not scanned for titles`, () => {
      const { corpus, requirements } = loadRealCorpus(path.join(FIXTURES, dir));
      assert.deepStrictEqual(corpus.docFiles.map((f) => f.file), ['AGENTS.md']);
      const readme = fs.readFileSync(path.join(FIXTURES, dir, 'README.md'), 'utf8');
      assert.ok(readme.includes(requirements[0].title), 'the fixture README.md must contain the requirement title');
      const violations = checkAll(requirements, corpus);
      assert.strictEqual(violations.length, 0, formatViolations(violations));
    });
  }

  it(`fixture: ${TREE_NESTED_CLEAN_FIXTURE} passes every rule and its nested AGENTS.md is scanned`, () => {
    const { corpus, requirements } = loadRealCorpus(path.join(FIXTURES, TREE_NESTED_CLEAN_FIXTURE));
    assert.deepStrictEqual(corpus.docFiles.map((f) => f.file), ['AGENTS.md', 'web/AGENTS.md']);
    const violations = checkAll(requirements, corpus);
    assert.strictEqual(violations.length, 0, formatViolations(violations));
  });

  for (const { dir, code, needle } of TREE_VIOLATION_FIXTURES) {
    it(`fixture: ${dir} fires ${code} through docs/** and no other rule`, () => {
      const { corpus, requirements } = loadRealCorpus(path.join(FIXTURES, dir));
      const violations = checkAll(requirements, corpus);
      assert.deepStrictEqual([...new Set(violations.map((v) => v.code))], [code], formatViolations(violations));
      assert.ok(violations.some((v) => v.message.includes(needle)), `no ${code} message mentions '${needle}'; got:\n${formatViolations(violations)}`);
    });
  }

  it('fixture: clean parses five requirements with their layer and status', () => {
    const { requirements } = loadFixtureCorpus(path.join(FIXTURES, 'clean'), GOLDEN);
    assert.deepStrictEqual(
      requirements.map((r) => `${r.id}:${r.layer}:${r.status}`),
      ['R-001:core:current', 'R-002:core:current', 'R-003:core:current', 'R-004:supporting:planned', 'R-005:out:dropped'],
    );
  });

  it('fixture: markdown variants parse bullets, bold keys, backticks and skip a heading inside a code fence', () => {
    const { requirements } = loadFixtureCorpus(path.join(FIXTURES, 'clean-markdown-variants'), GOLDEN);
    assert.deepStrictEqual(requirements.map((r) => r.id), ['R-001', 'R-002']);
    const [first, second] = requirements;
    assert.deepStrictEqual([first.layer, first.status], ['core', 'current']);
    assert.deepStrictEqual(first.evidence, ['tests.txt:1', 'tests.txt:2-3']);
    assert.deepStrictEqual(first.golden, ['secured/health']);
    assert.strictEqual(first.accept.length, 1);
    assert.deepStrictEqual([second.layer, second.status], ['supporting', 'planned']);
    assert.deepStrictEqual(second.evidence, ['tests.txt:1', 'tests.txt:2']);
  });

  it('fixture: c7-home-clean parses the home key of R-033 and R-034 and leaves R-001..R-032 without one', () => {
    const { requirements } = loadFixtureCorpus(path.join(FIXTURES, 'c7-home-clean'), GOLDEN);
    assert.strictEqual(requirements.length, 34);
    assert.deepStrictEqual(requirements.slice(0, 32).map((r) => r.home), Array(32).fill(''));
    assert.deepStrictEqual(requirements.slice(32).map((r) => r.home), [
      'web/src/request/domain',
      'web/src/request/domain/placeholder.txt',
    ]);
  });

  // A miniature repository without the legacy files: labels come from the recordings and test/golden/requests.js,
  // test titles and tags only from web/src/**/*.spec.ts and scripts/**/*.test.mjs.
  function withMiniRepo<T>(run: (root: string) => T): T {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssot-mini-'));
    const put = (name: string, text: string): void => {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      fs.writeFileSync(path.join(root, name), text);
    };
    try {
      put('AGENTS.md', 'see docs/ssot/requirements.md\n');
      put('docs/ssot/requirements.md', '### R-001 Mini\nlayer: core\nstatus: planned\n');
      put('test/golden/requests.js', "export const scenarios=[{name:'secured',mode:'secured',golden:true,steps:[{label:'from-corpus',path:'/'}]},{name:'open',mode:'open',golden:true,steps:[{label:'open-only',path:'/'}]}];\n");
      put('web/src/parity/recorded/one.json', '{"corpusSha256":"x","results":[\n  {"key":"secured/recorded-only","scenario":"secured","label":"recorded-only"}\n]}\n');
      put('web/src/a.spec.ts', "it('web title', () => {});\n");
      put('web/src/ssot.spec.ts', "it('skipped title', () => {});\n");
      put('test/old.test.js', "test('legacy title', () => {});\n");
      put('scripts/tool.test.mjs', "test('tool title', () => {});\n");
      return run(root);
    } finally {
      fs.rmSync(root, { recursive: true });
    }
  }

  it('real corpus: golden labels are the union of the recorded keys and the labels in test/golden/requests.js, no legacy-portal.json needed', () => {
    withMiniRepo((root) => {
      assert.ok(!fs.existsSync(path.join(root, 'test', 'golden', 'legacy-portal.json')));
      const { corpus } = loadRealCorpus(root);
      assert.deepStrictEqual([...corpus.goldenLabels].sort(), ['open/open-only', 'secured/from-corpus', 'secured/recorded-only']);
    });
  });

  it('real corpus: proof comes from web/src specs and root scripts tests, not from the legacy test/**/*.test.js', () => {
    withMiniRepo((root) => {
      const { corpus } = loadRealCorpus(root);
      assert.deepStrictEqual(corpus.testFiles.map((f) => f.file), ['web/src/a.spec.ts', 'scripts/tool.test.mjs']);
    });
  });

  it('real corpus: a missing request corpus or an empty label set fails loudly', () => {
    withMiniRepo((root) => {
      fs.rmSync(path.join(root, 'test', 'golden', 'requests.js'));
      fs.rmSync(path.join(root, 'web', 'src', 'parity', 'recorded', 'one.json'));
      assert.throws(() => loadRealCorpus(root), /request corpus|no labels/);
    });
  });

  it('fixture: a case directory without requirements.md fails loudly instead of passing', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'ssot-empty-'));
    try {
      assert.throws(() => loadFixtureCorpus(empty, GOLDEN), /missing .*requirements\.md/);
    } finally {
      fs.rmSync(empty, { recursive: true });
    }
  });

  // tests.txt in the clean fixture has exactly 3 lines.
  const EVIDENCE_BOUNDARY: { entry: string; fires: boolean }[] = [
    { entry: 'tests.txt', fires: false },
    { entry: 'tests.txt:1', fires: false },
    { entry: 'tests.txt:3', fires: false },
    { entry: 'tests.txt:1-3', fires: false },
    { entry: 'tests.txt:4', fires: true },
    { entry: 'tests.txt:1-4', fires: true },
    { entry: 'tests.txt:0', fires: true },
    { entry: 'tests.txt:3-2', fires: true },
    { entry: 'tests.txt:abc', fires: true },
    { entry: '/etc/passwd:1', fires: true },
    { entry: '../outside.txt:1', fires: true },
  ];
  for (const { entry, fires } of EVIDENCE_BOUNDARY) {
    it(`fixture: evidence '${entry}' ${fires ? 'fires' : 'does not fire'} C4`, () => {
      const { corpus } = loadFixtureCorpus(path.join(FIXTURES, 'clean'), GOLDEN);
      const text = `### R-001 Boundary probe\nlayer: core\nstatus: planned\nevidence:\n- ${entry}\n`;
      const violations = checkEvidence(parseRequirements(text), corpus);
      assert.strictEqual(violations.length > 0, fires, formatViolations(violations));
    });
  }

  // tests.txt in c4-anchor-clean: line 1 '// anchor target', line 2 'const alpha = 1;', line 3 'const beta = 2;'.
  const ANCHOR_BOUNDARY: { entry: string; fires: boolean; needle: string }[] = [
    { entry: 'tests.txt:2 ~ const alpha = 1;', fires: false, needle: '' },
    { entry: 'tests.txt:2~const alpha = 1;', fires: false, needle: '' }, // no spaces around ~
    { entry: 'tests.txt:2   ~   alpha   ', fires: false, needle: '' }, // spaces around ~ are trimmed, the literal is a substring
    { entry: 'tests.txt:1-3 ~ const beta = 2;', fires: false, needle: '' }, // range: literal on the last line
    { entry: 'tests.txt:2-3 ~ const alpha = 1;', fires: false, needle: '' }, // range: literal on the first line
    { entry: 'tests.txt ~ const beta = 2;', fires: false, needle: '' }, // no lines: whole file
    { entry: 'tests.txt:1 ~ const alpha = 1;', fires: true, needle: 'tests.txt:2' }, // one line above its home
    { entry: 'tests.txt:3 ~ const alpha = 1;', fires: true, needle: 'tests.txt:2' }, // one line below
    { entry: 'tests.txt:2 ~ const beta = 2;', fires: true, needle: 'tests.txt:3' },
    { entry: 'tests.txt:1-2 ~ const beta = 2;', fires: true, needle: 'tests.txt:3' }, // range ends one line short
    { entry: 'tests.txt:2 ~ Const alpha = 1;', fires: true, needle: 'not found' }, // case sensitive
    { entry: 'tests.txt:2 ~ const alpha = 1; // gone', fires: true, needle: 'not found' },
    { entry: 'tests.txt ~ const gamma = 3;', fires: true, needle: 'not found' },
    { entry: 'tests.txt:2 ~', fires: true, needle: 'empty' }, // an anchor without a literal
    { entry: 'tests.txt:2 ~    ', fires: true, needle: 'empty' },
    { entry: 'no-such-file.ts:2 ~ x', fires: true, needle: 'no-such-file.ts' },
    { entry: 'tests.txt:9 ~ const alpha = 1;', fires: true, needle: 'beyond' }, // line check still runs first
  ];
  for (const { entry, fires, needle } of ANCHOR_BOUNDARY) {
    it(`fixture: anchored evidence '${entry}' ${fires ? 'fires' : 'does not fire'} C4`, () => {
      const { corpus } = loadFixtureCorpus(path.join(FIXTURES, 'c4-anchor-clean'), GOLDEN);
      const text = `### R-001 Anchor probe\nlayer: core\nstatus: planned\nevidence:\n- ${entry}\n`;
      const violations = checkEvidence(parseRequirements(text), corpus);
      assert.strictEqual(violations.length > 0, fires, formatViolations(violations));
      if (fires) assert.ok(violations.some((v) => v.message.includes(needle)), `no message mentions '${needle}'; got:\n${formatViolations(violations)}`);
    });
  }

  it('anchor: a dropped requirement keeps a stale anchored pointer without firing', () => {
    const { corpus } = loadFixtureCorpus(path.join(FIXTURES, 'c4-anchor-clean'), GOLDEN);
    const text = '### R-001 Old\nlayer: out\nstatus: dropped\nevidence:\n- tests.txt:1 ~ const beta = 2;\n';
    assert.deepStrictEqual(checkEvidence(parseRequirements(text), corpus), []);
  });

  it('anchor: an inline evidence list keeps splitting on commas but an anchored entry keeps its commas', () => {
    const [plain, anchored] = [
      parseRequirements('### R-001 A\nlayer: core\nstatus: planned\nevidence: tests.txt:1, tests.txt:2\n')[0],
      parseRequirements('### R-001 A\nlayer: core\nstatus: planned\nevidence: tests.txt:2 ~ f(a, b)\n')[0],
    ];
    assert.deepStrictEqual(plain.evidence, ['tests.txt:1', 'tests.txt:2']);
    assert.deepStrictEqual(anchored.evidence, ['tests.txt:2 ~ f(a, b)']);
  });

  // home: rule C7. Requirements below R-033 are grandfathered; the probe pads the file so the id under test is in order.
  const HOME_PROBES: { id: number; home: string | null; fires: boolean; needle: string }[] = [
    { id: 32, home: null, fires: false, needle: '' }, // grandfathered: no home needed
    { id: 33, home: null, fires: true, needle: 'R-033' }, // first id that needs a home
    { id: 34, home: null, fires: true, needle: 'R-034' },
    { id: 33, home: 'web/src/request/domain', fires: false, needle: '' },
    { id: 33, home: 'web/src/request', fires: false, needle: '' },
    { id: 33, home: 'web/src/request/domain/placeholder.txt', fires: false, needle: '' },
    { id: 33, home: 'web/src/request/…', fires: false, needle: '' },
    { id: 33, home: 'web/src/request/domain/**', fires: false, needle: '' },
    { id: 33, home: 'web/src/req…', fires: false, needle: '' }, // a prefix of an existing name
    { id: 33, home: 'web/src/nowhere/domain', fires: true, needle: 'nowhere' },
    { id: 33, home: 'web/src/request/nothing-here', fires: true, needle: 'nothing-here' },
    { id: 33, home: 'web/src/xyz…', fires: true, needle: 'xyz' },
    { id: 33, home: 'web/src', fires: true, needle: 'context' }, // no context directory
    { id: 33, home: 'web/src/', fires: true, needle: 'context' },
    { id: 33, home: 'web/src/../../outside', fires: true, needle: 'web/src' },
    { id: 33, home: 'docs/ssot', fires: true, needle: 'web/src' },
    { id: 33, home: 'legacy — still served by the old portal', fires: true, needle: 'legacy' }, // the legacy home grammar is gone
    { id: 33, home: 'legacy', fires: true, needle: 'legacy' },
    { id: 32, home: 'web/src/nowhere/domain', fires: true, needle: 'nowhere' }, // exempt means not required, a given home is still checked
  ];
  for (const { id, home, fires, needle } of HOME_PROBES) {
    it(`fixture: R-${String(id).padStart(3, '0')} home ${home === null ? '(absent)' : `'${home}'`} ${fires ? 'fires' : 'does not fire'} C7`, () => {
      const { corpus } = loadFixtureCorpus(path.join(FIXTURES, 'c7-home-clean'), GOLDEN);
      const padding = Array.from({ length: id - 1 }, (_, i) => `### R-${String(i + 1).padStart(3, '0')} Padding ${i + 1}\nlayer: supporting\nstatus: planned\n`);
      const probe = `### R-${String(id).padStart(3, '0')} Home probe\nlayer: core\nstatus: planned\n${home === null ? '' : `home: ${home}\n`}`;
      const violations = checkAll(parseRequirements([...padding, probe].join('\n')), corpus);
      assert.deepStrictEqual([...new Set(violations.map((v) => v.code))], fires ? ['C7'] : [], formatViolations(violations));
      if (fires) assert.ok(violations.some((v) => v.message.includes(needle)), `no message mentions '${needle}'; got:\n${formatViolations(violations)}`);
    });
  }
});

describe('ssot checks on the real tree', () => {
  it('real tree: docs/ssot/requirements.md satisfies C1..C7', (t) => {
    const { corpus, requirements } = loadRealCorpus(REPO);
    const byStatus = new Map<string, number>();
    for (const r of requirements) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    t.diagnostic(
      `ssot scanned: ${requirements.length} requirements (${[...byStatus].map(([s, n]) => `${s}=${n}`).join(', ')}), ` +
        `${corpus.testFiles.length} test files, ${corpus.docFiles.length} doc files, ${corpus.goldenLabels.size} golden labels`,
    );
    t.diagnostic(`ssot test files: ${corpus.testFiles.map((f) => f.file).join(', ')}`);
    t.diagnostic(`ssot doc files: ${corpus.docFiles.map((f) => f.file).join(', ')}`);
    const unclaimed = unclaimedGoldenLabels(requirements, corpus.goldenLabels);
    t.diagnostic(`golden labels no requirement claims (${unclaimed.length}): ${unclaimed.join(', ') || 'none'}`);
    const violations = checkAll(requirements, corpus);
    assert.strictEqual(violations.length, 0, formatViolations(violations));
  });
});

// scripts/ssot-repin.ts: finds anchored evidence whose literal moved and prints (or writes) the corrected pointer.
describe('ssot-repin', () => {
  const SCRIPT = path.resolve(SRC, '..', 'scripts', 'ssot-repin.ts');
  const TARGET = ['// one', 'const alpha = 1;', 'const beta = 2;', 'const alpha = 1;', '', 'const gamma = 3;', 'const delta = 4;', ''].join('\n');

  function withRoot<T>(run: (root: string) => T): T {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssot-repin-'));
    try {
      fs.writeFileSync(path.join(root, 'target.ts'), TARGET);
      return run(root);
    } finally {
      fs.rmSync(root, { recursive: true });
    }
  }

  const block = (id: string, evidence: string[], status = 'current'): string =>
    `### ${id} Repin probe ${id}\nlayer: core\nstatus: ${status}\nevidence:\n${evidence.map((e) => `- ${e}`).join('\n')}\naccept:\n- Given x / When y / Then z\n`;

  it('repin: a pointer whose literal is still at the cited line stays and is not reported', () => {
    withRoot((root) => {
      const text = block('R-001', ['target.ts:3 ~ const beta = 2;', 'target.ts:2-3 ~ const beta = 2;']);
      const plan = planRepins(text, root);
      assert.deepStrictEqual(plan.problems, []);
      assert.deepStrictEqual(plan.repins, []);
      assert.strictEqual(plan.text, text);
    });
  });

  it('repin: a moved single-line pointer is rewritten to the one place the literal now occurs', () => {
    withRoot((root) => {
      const text = block('R-001', ['target.ts:1 ~ const beta = 2;']);
      const plan = planRepins(text, root);
      assert.deepStrictEqual(plan.problems, []);
      assert.deepStrictEqual(plan.repins.map((r) => `${r.id} ${r.from} -> ${r.to}`), ['R-001 target.ts:1 -> target.ts:3']);
      assert.strictEqual(plan.text, text.replace('target.ts:1 ~', 'target.ts:3 ~'));
    });
  });

  it('repin: a moved range keeps its length and starts at the literal', () => {
    withRoot((root) => {
      const plan = planRepins(block('R-001', ['target.ts:1-2 ~ const gamma = 3;']), root);
      assert.deepStrictEqual(plan.repins.map((r) => `${r.from} -> ${r.to}`), ['target.ts:1-2 -> target.ts:6-7']);
      assert.ok(plan.text.includes('- target.ts:6-7 ~ const gamma = 3;'));
    });
  });

  it('repin: a range that would run past the end of the file keeps its length and ends on the last line', () => {
    withRoot((root) => {
      const plan = planRepins(block('R-001', ['target.ts:1-5 ~ const delta = 4;']), root);
      assert.deepStrictEqual(plan.repins.map((r) => r.to), ['target.ts:3-7']); // delta is the last line (7); the range 1-5 spans 5 lines
    });
  });

  it('repin: the output is stable, planning it again changes nothing', () => {
    withRoot((root) => {
      const first = planRepins(block('R-001', ['target.ts:1 ~ const beta = 2;']), root);
      const second = planRepins(first.text, root);
      assert.deepStrictEqual(second.repins, []);
      assert.strictEqual(second.text, first.text);
    });
  });

  it('repin: a literal that occurs nowhere is a problem and the text is left alone', () => {
    withRoot((root) => {
      const text = block('R-001', ['target.ts:1 ~ const missing = 0;']);
      const plan = planRepins(text, root);
      assert.strictEqual(plan.problems.length, 1);
      assert.match(plan.problems[0], /R-001.*not found/);
      assert.strictEqual(plan.text, text);
    });
  });

  it('repin: a literal that occurs several times elsewhere is a problem that lists every place', () => {
    withRoot((root) => {
      const plan = planRepins(block('R-001', ['target.ts:3 ~ const alpha = 1;']), root);
      assert.strictEqual(plan.problems.length, 1);
      assert.match(plan.problems[0], /target\.ts:2, target\.ts:4/);
      assert.deepStrictEqual(plan.repins, []);
    });
  });

  it('repin: several occurrences are fine while one of them is inside the cited lines', () => {
    withRoot((root) => {
      const plan = planRepins(block('R-001', ['target.ts:4 ~ const alpha = 1;']), root);
      assert.deepStrictEqual(plan.problems, []);
      assert.deepStrictEqual(plan.repins, []);
    });
  });

  it('repin: a missing file is a problem', () => {
    withRoot((root) => {
      const plan = planRepins(block('R-001', ['gone.ts:1 ~ x']), root);
      assert.match(plan.problems[0], /R-001.*gone\.ts/);
    });
  });

  it('repin: unanchored entries are counted, dropped requirements are skipped and nothing is rewritten', () => {
    withRoot((root) => {
      const text = block('R-001', ['target.ts:1', 'target.ts:2 ~ const alpha = 1;', 'target.ts']) + '\n' + block('R-002', ['target.ts:1 ~ const beta = 2;', 'target.ts:2'], 'dropped');
      const plan = planRepins(text, root);
      assert.strictEqual(plan.unanchored, 2);
      assert.deepStrictEqual(plan.problems, []);
      assert.strictEqual(plan.text, text);
    });
  });

  it('repin: only the block of the requirement that owns the pointer is edited', () => {
    withRoot((root) => {
      const text = block('R-001', ['target.ts:3 ~ const beta = 2;']) + '\n' + block('R-002', ['target.ts:1 ~ const beta = 2;']);
      const plan = planRepins(text, root);
      const [first, second] = plan.text.split('### R-002');
      assert.ok(first.includes('target.ts:3 ~'));
      assert.ok(second.includes('target.ts:3 ~') && !second.includes('target.ts:1 ~'));
    });
  });

  it('repin: an anchored entry written inline after the key is found on the key line', () => {
    withRoot((root) => {
      const text = '### R-001 Inline\nlayer: core\nstatus: planned\nevidence: target.ts:1 ~ const beta = 2;\n';
      const plan = planRepins(text, root);
      assert.strictEqual(plan.problems.length, 0, plan.problems.join('\n'));
      assert.strictEqual(plan.text, text.replace('target.ts:1 ~', 'target.ts:3 ~'));
    });
  });

  it('repin: the same anchored entry listed twice in one requirement is fixed once and reported once', () => {
    withRoot((root) => {
      const plan = planRepins(block('R-001', ['target.ts:1 ~ const beta = 2;', 'target.ts:1 ~ const beta = 2;']), root);
      assert.deepStrictEqual(plan.problems, []);
      assert.strictEqual(plan.repins.length, 1);
      assert.strictEqual(plan.text.split('target.ts:3 ~ const beta = 2;').length, 3);
    });
  });

  function runScript(root: string, args: string[]) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8' });
  }

  it('repin script: dry run prints the corrected pointer and the unanchored count and leaves the file alone', () => {
    withRoot((root) => {
      const file = path.join(root, 'requirements.md');
      const text = block('R-001', ['target.ts:1 ~ const beta = 2;', 'target.ts:2']);
      fs.writeFileSync(file, text);
      const run = runScript(root, ['requirements.md']);
      assert.strictEqual(run.status, 0, run.stderr);
      assert.match(run.stdout, /R-001 target\.ts:1 -> target\.ts:3/);
      assert.match(run.stdout, /unanchored: 1/);
      assert.strictEqual(fs.readFileSync(file, 'utf8'), text);
    });
  });

  it('repin script: --write rewrites the file and a second run reports nothing to do', () => {
    withRoot((root) => {
      const file = path.join(root, 'requirements.md');
      fs.writeFileSync(file, block('R-001', ['target.ts:1 ~ const beta = 2;']));
      assert.strictEqual(runScript(root, ['requirements.md', '--write']).status, 0);
      assert.ok(fs.readFileSync(file, 'utf8').includes('- target.ts:3 ~ const beta = 2;'));
      const again = runScript(root, ['requirements.md']);
      assert.strictEqual(again.status, 0, again.stderr);
      assert.doesNotMatch(again.stdout, /->/);
    });
  });

  it('repin script: a problem exits 1 with the reason on stderr and --write writes nothing', () => {
    withRoot((root) => {
      const file = path.join(root, 'requirements.md');
      const text = block('R-001', ['target.ts:1 ~ const beta = 2;']) + '\n' + block('R-002', ['target.ts:1 ~ const missing = 0;']);
      fs.writeFileSync(file, text);
      const run = runScript(root, ['requirements.md', '--write']);
      assert.strictEqual(run.status, 1);
      assert.match(run.stderr, /R-002.*not found/);
      assert.strictEqual(fs.readFileSync(file, 'utf8'), text);
    });
  });

  it('repin script: no argument, an unknown flag or a missing file exit 2 with a usage line', () => {
    withRoot((root) => {
      for (const args of [[], ['requirements.md', '--wrte'], ['nope.md']]) {
        const run = runScript(root, args);
        assert.strictEqual(run.status, 2, `${args.join(' ')}: ${run.stderr}`);
        assert.match(run.stderr, /usage|nope\.md/i);
      }
    });
  });
});
