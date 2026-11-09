// The legacy portal's answers, replayed from committed recordings instead of a running server.
//
//   const expected = await recordedResults('settings', corpus);   // where specs used runCorpus(startLegacyOracle, corpus)
//
// A recording is `recorded/<spec-id>.json` = { corpusSha256, recordedAt, results }: the normalized results the legacy server
// gave to the corpus the spec runs. corpusSha256 is the sha256 of the canonical JSON of the scenarios the spec runs (the modes
// runCorpus would run) plus the corpus variables that are not clock values. A corpus that no longer matches fails loudly:
// the old server is gone, so the answers of a changed request cannot be asked for again.
//
// Clock: the corpus asks for "the current month" (MONTH, PREV_MONTH, NEXT_MONTH, NOW). A replay shifts Date (only Date) to the
// instant the recording was made, so the candidate sees the same months as the recording on any later day.
//
// Recording: record-parity.ts runs the specs with PARITY_RECORD_OUT=<dir>; recordedResults then asks the live oracle that the
// recorder registered under LIVE_ORACLE (this file never imports the legacy server), runs it twice, requires equal answers,
// and writes <dir>/<spec-id>.json instead of reading the committed one.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare, formatDifferences, runCorpus } from './runner.ts';
import type { Corpus, Result, Scenario, SessionFactory } from './runner.ts';

export const RECORDED_DIR = fileURLToPath(new URL('./recorded/', import.meta.url));
export const LIVE_ORACLE = Symbol.for('orbit.parity.liveOracle');
export const CLOCK_VARS = ['NOW', 'MONTH', 'PREV_MONTH', 'NEXT_MONTH'];
export const CHANGED_CORPUS = 'corpus changed and the old server is gone; write a Next scenario spec instead';

export interface Recording {
  corpusSha256: string;
  recordedAt: string;
  results: Result[];
}
export interface RecordedOptions {
  modes?: Array<Scenario['mode']>;
  /** Makes tie-ordered answers order-free (lists as sets). Applied when recording; the spec applies it to the candidate too. */
  canonicalize?: (results: Result[]) => Result[];
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function corpusSha256(corpus: Corpus, modes: Array<Scenario['mode']> = ['secured']): string {
  const scenarios = corpus.scenarios.filter((s) => modes.includes(s.mode));
  const vars = Object.fromEntries(Object.entries(corpus.baseVars()).filter(([k]) => !CLOCK_VARS.includes(k)));
  return createHash('sha256').update(canonicalJson({ scenarios, vars })).digest('hex');
}

export const recordingPath = (specId: string, dir: string = RECORDED_DIR): string => path.join(dir, `${specId}.json`);

// One result per line keeps a changed recording readable in a diff.
export function serializeRecording(recording: Recording): string {
  const results = recording.results.map((r) => '  ' + JSON.stringify(r)).join(',\n');
  return `{"corpusSha256":"${recording.corpusSha256}","recordedAt":"${recording.recordedAt}","results":[\n${results}\n]}\n`;
}

// Shifts Date (only Date) by a constant so "now" is the recording's instant plus the time that has passed since the replay
// started: the months match the recording, and clocks still advance (rows created in one test do not tie on created_at).
let clockShifted = false;
function shiftClock(recordedAt: string): void {
  if (clockShifted) return;
  clockShifted = true;
  const Real = Date;
  const offset = Date.parse(recordedAt) - Real.now();
  class Shifted extends Real {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(Real.now() + offset);
      else super(...(args as [string]));
    }
    static override now(): number {
      return Real.now() + offset;
    }
  }
  globalThis.Date = Shifted as unknown as DateConstructor;
}

async function record(specId: string, corpus: Corpus, options: RecordedOptions, outDir: string): Promise<Result[]> {
  const live = (globalThis as Record<symbol, unknown>)[LIVE_ORACLE] as SessionFactory | undefined;
  if (live === undefined) throw new Error('PARITY_RECORD_OUT is set but no live oracle is registered: run node web/scripts/record-parity.ts');
  const canonicalize = options.canonicalize ?? ((r: Result[]) => r);
  const recordedAt = new Date().toISOString();
  const sha = corpusSha256(corpus, options.modes);
  const first = canonicalize(await runCorpus(live, corpus, { modes: options.modes }));
  const second = canonicalize(await runCorpus(live, corpus, { modes: options.modes }));
  const diffs = compare(first, second);
  if (diffs.length > 0) throw new Error(`recording ${specId}: the legacy oracle is not deterministic\n${formatDifferences(diffs)}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(recordingPath(specId, outDir), serializeRecording({ corpusSha256: sha, recordedAt, results: first }));
  return first;
}

export async function recordedResults(specId: string, corpus: Corpus, options: RecordedOptions = {}): Promise<Result[]> {
  const outDir = process.env.PARITY_RECORD_OUT;
  if (outDir !== undefined && outDir !== '') return record(specId, corpus, options, outDir);
  const file = recordingPath(specId);
  if (!existsSync(file)) throw new Error(`no recording for spec '${specId}' (${file}); record it with node web/scripts/record-parity.ts while the old server still exists, otherwise write a Next scenario spec instead`);
  const recording = JSON.parse(readFileSync(file, 'utf8')) as Recording;
  shiftClock(recording.recordedAt);
  const sha = corpusSha256(corpus, options.modes);
  if (sha !== recording.corpusSha256) {
    throw new Error(`${CHANGED_CORPUS} (spec '${specId}': recorded corpus ${recording.corpusSha256.slice(0, 12)}, spec runs ${sha.slice(0, 12)})`);
  }
  return recording.results;
}
