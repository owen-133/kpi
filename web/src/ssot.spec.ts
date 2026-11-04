// Keeps docs/ssot/requirements.md consistent with the tests. Checking functions live in ssot.helpers.ts.
// Rules C1..C6 are described there. Fixtures under web/ssot-fixtures/<case>/ prove each rule fires.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
const GOLDEN = path.join(REPO, 'test', 'golden', 'legacy-portal.json');

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
  { dir: 'c5-unknown-tag', code: 'C5', needle: 'R-007' },
  { dir: 'c5-planned-tag', code: 'C5', needle: 'planned' },
  { dir: 'c5-dropped-tag', code: 'C5', needle: 'dropped' },
  { dir: 'c6-title-in-docs', code: 'C6', needle: 'Register a request' },
  { dir: 'c6-no-agents-mention', code: 'C6', needle: 'docs/ssot/requirements.md' },
];
const CLEAN_FIXTURES = ['clean', 'clean-markdown-variants'];

function fixtureViolations(dir: string) {
  const { corpus, requirements } = loadFixtureCorpus(path.join(FIXTURES, dir), GOLDEN);
  return checkAll(requirements, corpus);
}

describe('ssot checks fire on violation fixtures and pass on clean ones', () => {
  it('fixture: every directory under ssot-fixtures is declared here and every declared one exists', () => {
    const onDisk = fs.readdirSync(FIXTURES, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const declared = [...VIOLATION_FIXTURES.map((f) => f.dir), ...CLEAN_FIXTURES].sort();
    assert.deepStrictEqual(onDisk, declared);
  });

  it('fixture: the golden label used by the clean fixtures exists in the real golden file', () => {
    const { corpus } = loadFixtureCorpus(path.join(FIXTURES, 'clean'), GOLDEN);
    assert.ok(corpus.goldenLabels.has('secured/health'), 'secured/health missing from test/golden/legacy-portal.json');
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
});

describe('ssot checks on the real tree', () => {
  it('real tree: docs/ssot/requirements.md satisfies C1..C6', (t) => {
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
