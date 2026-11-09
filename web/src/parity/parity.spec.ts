// HTTP parity harness specs: pure normalize/compare tests, the recording sanity checks and the fire checks.
// Per-context specs use parityAgainst() from ./parityAgainst.ts (see its header comment).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compare, formatDifferences, hintMisses, loadCorpus, normalize, runCorpus } from './runner.ts';
import type { Result, SessionFactory, Target } from './runner.ts';
import { pgliteAvailable } from './credentials.ts';
import { recordedResults } from './recordedOracle.ts';
import { startNextCandidate } from './nextCandidate.ts';
import { parityAgainst } from './parityAgainst.ts';

const ID_A = '0b0f6c1e-1111-4222-8333-444455556666';
const ID_B = '9a9a9a9a-1111-4222-8333-444455556666';

const result = (label: string, over: Partial<Result> = {}): Result => ({
  key: `s/${label}`,
  scenario: 's',
  label,
  request: `GET /${label}`,
  status: 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: { json: { ok: true } },
  ...over,
});

describe('normalize', () => {
  it('maps ids to first-appearance placeholders and reuses a placeholder for the same id', () => {
    const out = normalize({ id: ID_A, other: ID_B, again: ID_A, list: [ID_B] });
    assert.deepEqual(out, { id: '<ID-1>', other: '<ID-2>', again: '<ID-1>', list: ['<ID-2>'] });
  });

  it('numbers ids by first appearance across calls that share one normalizer state', () => {
    const state = { ids: new Map<string, string>(), hashes: new Map<string, string>() };
    assert.equal(normalize(`/api/tasks/${ID_B}`, state), '/api/tasks/<ID-1>');
    assert.deepEqual(normalize({ id: ID_A, prior: ID_B }, state), { id: '<ID-2>', prior: '<ID-1>' });
  });

  it('maps JS and PostgREST timestamp spellings to the same placeholder', () => {
    const spellings = [
      '2026-11-03T01:00:00.000Z',
      '2026-11-03T01:00:00Z',
      '2026-11-03T01:00:00.123456+00:00',
      '2026-11-03T10:00:00+09:00',
      '2026-11-03 01:00:00+00',
    ];
    for (const s of spellings) assert.equal(normalize(s), '<TS>', s);
    assert.equal(normalize('집계 시점 2026-11-03T01:00:00.000Z.'), '집계 시점 <TS>.');
  });

  it('maps epoch numbers (seconds and milliseconds) to <TS> and keeps ordinary numbers', () => {
    assert.deepEqual(normalize({ ms: 1788396000000, s: 1788396000, size: 1048576, status: 201, zero: 0 }), {
      ms: '<TS>',
      s: '<TS>',
      size: 1048576,
      status: 201,
      zero: 0,
    });
  });

  it('keeps date-only strings and plain text untouched', () => {
    assert.deepEqual(normalize({ due_date: '2026-11-05', note: '메모' }), { due_date: '2026-11-05', note: '메모' });
  });

  it('maps 64-hex digests to first-appearance placeholders', () => {
    const a = 'a'.repeat(64);
    const b = 'b'.repeat(64);
    assert.deepEqual(normalize([a, b, a]), ['<HASH-1>', '<HASH-2>', '<HASH-1>']);
  });
});

describe('compare', () => {
  it('returns no differences for identical results, ignoring object key order', () => {
    const a = [result('x', { body: { json: { a: 1, b: { c: 2, d: 3 } } } })];
    const b = [result('x', { body: { json: { b: { d: 3, c: 2 }, a: 1 } } })];
    assert.deepEqual(compare(a, b), []);
  });

  it('reports a status difference under its label', () => {
    const diffs = compare([result('x'), result('y')], [result('x'), result('y', { status: 500 })]);
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].label, 's/y');
    assert.equal(diffs[0].field, 'status');
    assert.equal(diffs[0].expected, 200);
    assert.equal(diffs[0].actual, 500);
  });

  it('reports header differences per header name, including a header missing on one side', () => {
    const diffs = compare(
      [result('x', { headers: { 'cache-control': 'no-store' } })],
      [result('x', { headers: { 'www-authenticate': 'Basic' } })],
    );
    assert.deepEqual(diffs.map((d) => d.field).sort(), ['headers.cache-control', 'headers.www-authenticate']);
  });

  it('reports a JSON body difference at the path that differs', () => {
    const diffs = compare(
      [result('x', { body: { json: { task: { title: 'a', tags: [1, 2] } } } })],
      [result('x', { body: { json: { task: { title: 'b', tags: [1, 3] } } } })],
    );
    assert.deepEqual(diffs.map((d) => d.field), ['body.task.title', 'body.task.tags[1]']);
  });

  it('reports a label that only one side has', () => {
    const diffs = compare([result('x'), result('only-a')], [result('x'), result('only-b')]);
    assert.deepEqual(diffs.map((d) => [d.label, d.field]), [['s/only-a', 'missing'], ['s/only-b', 'extra']]);
  });

  it('distinguishes a json body from a text body and from bytes', () => {
    const diffs = compare([result('x', { body: { text: '{}' } })], [result('x', { body: { json: {} } })]);
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].field, 'body');
  });

  it('formats differences as one readable line per difference', () => {
    const text = formatDifferences(compare([result('x')], [result('x', { status: 404 })]));
    assert.match(text, /s\/x/);
    assert.match(text, /status/);
    assert.match(text, /200/);
    assert.match(text, /404/);
    assert.equal(formatDifferences([]), 'no differences');
  });
});

describe('hintMisses', () => {
  it('lists results whose status differs from the expectation hint of the step', () => {
    const rs = [result('a', { expectedStatus: 200 }), result('b', { expectedStatus: 201 }), result('c')];
    assert.deepEqual(hintMisses(rs).map((r) => r.key), ['s/b']);
  });
});

const skip = pgliteAvailable() ? false : 'PGlite not available: set ORBIT_PGLITE_PATH or run (cd web && npm ci) to run the candidate';
// The recorder (record-parity.ts) sets PARITY_RECORD_OUT: the specs below that probe the replay path would write instead of read.
const recording = process.env.PARITY_RECORD_OUT ? 'the recorder is running: this probes the replay path' : false;
const skipFire = skip || recording;

describe('recorded legacy answers', () => {
  it('corpus loads with labeled steps, unique labels per scenario and golden scenarios flagged', async () => {
    const corpus = await loadCorpus();
    assert.ok(corpus.scenarios.length >= 4);
    for (const sc of corpus.scenarios) {
      const labels = sc.steps.map((s) => s.label);
      assert.equal(new Set(labels).size, labels.length, `duplicate labels in ${sc.name}`);
    }
    assert.deepEqual(corpus.scenarios.filter((s) => s.golden).map((s) => s.name), ['secured', 'open']);
    assert.ok(corpus.scenarios.some((s) => s.name === 'char-tasks'));
    assert.ok(corpus.scenarios.some((s) => s.name === 'char-kpi'));
  });

  it('the recording of the whole corpus has one answer per secured step and every status hint holds', async () => {
    const corpus = await loadCorpus();
    const recorded = await recordedResults('corpus', corpus);
    const secured = corpus.scenarios.filter((s) => s.mode === 'secured');
    const total = secured.reduce((n, s) => n + s.steps.length, 0);
    console.log(`parity recording: ${recorded.length} requests in ${secured.length} scenarios`);
    assert.equal(recorded.length, total);
    const misses = hintMisses(recorded);
    assert.equal(misses.length, 0, `status hints missed:\n${misses.map((r) => `${r.key} expected ${r.expectedStatus} got ${r.status}`).join('\n')}`);
  });

  it('a recording of another corpus is refused: the old server is gone', { skip: recording }, async () => {
    const corpus = await loadCorpus();
    const changed = { ...corpus, scenarios: corpus.scenarios.map((s) => ({ ...s, steps: s.steps.slice(1) })) };
    await assert.rejects(recordedResults('corpus', changed), /corpus changed and the old server is gone; write a Next scenario spec instead/);
  });

  it('a spec without a recording fails loudly', { skip: recording }, async () => {
    await assert.rejects(recordedResults('no-such-spec', await loadCorpus()), /no recording for spec 'no-such-spec'/);
  });

  it('FIRE: a candidate that changes one status code is reported under exactly that label', { skip: skipFire, timeout: 240_000 }, async () => {
    const corpus = await loadCorpus();
    const reference = await recordedResults('corpus', corpus);
    const tampered: SessionFactory = async () => {
      const inner = await startNextCandidate();
      const handle: Target = async (request) => {
        const res = await inner.handle(request);
        const credentials = Buffer.from((request.headers.get('authorization') ?? '').slice(6), 'base64').toString();
        const viewer = credentials.startsWith('viewer:');
        if (new URL(request.url).pathname === '/api/session' && viewer) {
          return new Response(await res.text(), { status: 418, headers: res.headers });
        }
        return res;
      };
      return { handle, stop: inner.stop };
    };
    const diffs = compare(reference.filter((r) => r.label === 'session-viewer'), (await runCorpus(tampered, corpus)).filter((r) => r.label === 'session-viewer'));
    assert.deepEqual([...new Set(diffs.map((d) => d.label))], ['secured/session-viewer'], formatDifferences(diffs));
    assert.deepEqual(diffs.map((d) => d.field), ['status']);
  });

  it('FIRE: a candidate that changes one JSON field is reported under exactly that label and path', { skip: skipFire, timeout: 240_000 }, async () => {
    const corpus = await loadCorpus();
    const reference = await recordedResults('corpus', corpus);
    const tampered: SessionFactory = async () => {
      const inner = await startNextCandidate();
      const handle: Target = async (request) => {
        const res = await inner.handle(request);
        if (new URL(request.url).pathname === '/health' && request.method === 'GET') {
          return Response.json({ ok: false }, { status: res.status, headers: res.headers });
        }
        return res;
      };
      return { handle, stop: inner.stop };
    };
    const diffs = compare(reference.filter((r) => r.label === 'health'), (await runCorpus(tampered, corpus)).filter((r) => r.label === 'health'));
    assert.deepEqual(diffs.map((d) => [d.label, d.field]), [['secured/health', 'body.ok']], formatDifferences(diffs));
  });
});
