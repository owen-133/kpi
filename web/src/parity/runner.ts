// HTTP parity runner: sends the shared request corpus (test/golden/requests.js) to a target and returns
// normalized results, so two implementations of the same API can be compared response by response.
//  - Target: any `(request) => Promise<Response>`. A Session is a target plus its stop function; runCorpus
//    asks a SessionFactory for a fresh session per scenario (each scenario starts from an empty database).
//  - normalize(): ids -> <ID-n> and 64-hex digests -> <HASH-n> by first appearance, timestamps (ISO strings in
//    JS or PostgREST spelling, epoch seconds or milliseconds) -> <TS>. It also hides differences in timestamps
//    echoed from the request; the spelling of a timestamp is not part of parity.
//  - A Result keeps the status, the content-type / cache-control / www-authenticate /
//    content-security-policy / x-content-type-options headers and the body (JSON, text, or bytes as length + sha256).
//  - compare() returns the differences by label; formatDifferences() renders them for an assertion message.
import { createHash } from 'node:crypto';

export type Target = (request: Request) => Promise<Response>;
export interface Session {
  handle: Target;
  stop?: () => Promise<void>;
}
export type SessionFactory = () => Promise<Session>;

export interface Step {
  label: string;
  path: string;
  method?: string;
  user?: string;
  password?: string;
  headers?: Record<string, string>;
  body?: unknown;
  raw?: string;
  binary?: boolean;
  save?: Record<string, string>;
  expect?: { status: number };
}
export interface Scenario {
  name: string;
  mode: 'secured' | 'open';
  golden: boolean;
  steps: Step[];
}
export interface Corpus {
  scenarios: Scenario[];
  resolveStep(step: Step, vars: Record<string, unknown>): Omit<Step, 'save' | 'expect'>;
  captureVars(step: Step, parsed: unknown, vars: Record<string, unknown>): void;
  baseVars(): Record<string, unknown>;
}

export type Body = { json: unknown } | { text: string } | { bytes: number; sha256: string };
export interface Result {
  key: string; // `${scenario}/${label}`
  scenario: string;
  label: string;
  request: string;
  status: number;
  headers: Record<string, string>;
  body: Body;
  expectedStatus?: number;
}
export interface Difference {
  label: string;
  field: string;
  expected: unknown;
  actual: unknown;
}

// The origin every corpus request is addressed to. A same-origin Origin header carries this value.
export const PARITY_ORIGIN = 'http://parity.test';
const KEPT_HEADERS = ['content-type', 'cache-control', 'www-authenticate', 'content-security-policy', 'x-content-type-options'];

export interface NormalizerState {
  ids: Map<string, string>;
  hashes: Map<string, string>;
}
export const newNormalizer = (): NormalizerState => ({ ids: new Map(), hashes: new Map() });

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const HASH = /\b[0-9a-f]{64}\b/g;
const STAMP = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?/g;
const isEpoch = (n: number): boolean =>
  Number.isInteger(n) && ((n >= 1e9 && n <= 4e9) || (n >= 1e12 && n <= 4e12));

function placeholder(map: Map<string, string>, value: string, prefix: string): string {
  let mapped = map.get(value);
  if (mapped === undefined) {
    mapped = `<${prefix}-${map.size + 1}>`;
    map.set(value, mapped);
  }
  return mapped;
}

export function normalize(value: unknown, state: NormalizerState = newNormalizer()): unknown {
  if (typeof value === 'string') {
    return value
      .replace(STAMP, '<TS>')
      .replace(UUID, (m) => placeholder(state.ids, m, 'ID'))
      .replace(HASH, (m) => placeholder(state.hashes, m, 'HASH'));
  }
  if (typeof value === 'number') return isEpoch(value) ? '<TS>' : value;
  if (Array.isArray(value)) return value.map((v) => normalize(v, state));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, state)]));
  }
  return value;
}

export async function loadCorpus(): Promise<Corpus> {
  const url = new URL('../../../test/golden/requests.js', import.meta.url).href;
  return (await import(url)) as Corpus;
}

function buildRequest(step: Omit<Step, 'save' | 'expect'>): Request {
  const headers = new Headers(step.headers ?? {});
  if (step.user !== undefined) {
    headers.set('Authorization', 'Basic ' + Buffer.from(`${step.user}:${step.password ?? ''}`).toString('base64'));
  }
  const payload = step.raw !== undefined ? step.raw : step.body !== undefined ? JSON.stringify(step.body) : undefined;
  if (payload !== undefined) headers.set('Content-Type', 'application/json');
  return new Request(PARITY_ORIGIN + step.path, { method: step.method ?? 'GET', headers, body: payload });
}

async function runScenario(handle: Target, scenario: Scenario, corpus: Corpus): Promise<Result[]> {
  const state = newNormalizer();
  const vars: Record<string, unknown> = { ...corpus.baseVars(), ORIGIN: PARITY_ORIGIN };
  const out: Result[] = [];
  for (const step of scenario.steps) {
    const resolved = corpus.resolveStep(step, vars);
    const method = resolved.method ?? 'GET';
    const response = await handle(buildRequest(resolved));
    const buffer = Buffer.from(await response.arrayBuffer());
    const headers: Record<string, string> = {};
    for (const name of KEPT_HEADERS) {
      const v = response.headers.get(name);
      if (v !== null) headers[name] = v;
    }
    const request = String(normalize(`${method} ${resolved.path}`, state));
    let parsed: unknown;
    let body: Body;
    if (step.binary) {
      body = { bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') };
    } else {
      const text = buffer.toString('utf8');
      try {
        parsed = JSON.parse(text);
        body = { json: normalize(parsed, state) };
      } catch {
        body = { text: String(normalize(text, state)) };
      }
    }
    corpus.captureVars(step, parsed, vars);
    out.push({
      key: `${scenario.name}/${step.label}`,
      scenario: scenario.name,
      label: step.label,
      request,
      status: response.status,
      headers,
      body,
      ...(step.expect ? { expectedStatus: step.expect.status } : {}),
    });
  }
  return out;
}

// Runs the scenarios of the given modes (default: secured) in order, each against a fresh session.
export async function runCorpus(
  factory: SessionFactory,
  corpus: Corpus,
  options: { modes?: Array<Scenario['mode']> } = {},
): Promise<Result[]> {
  const modes = options.modes ?? ['secured'];
  const out: Result[] = [];
  for (const scenario of corpus.scenarios.filter((s) => modes.includes(s.mode))) {
    const session = await factory();
    try {
      out.push(...(await runScenario(session.handle, scenario, corpus)));
    } finally {
      await session.stop?.();
    }
  }
  return out;
}

function diffValue(path: string, a: unknown, b: unknown, push: (field: string, a: unknown, b: unknown) => void): void {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) diffValue(`${path}[${i}]`, a[i], b[i], push);
    return;
  }
  const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (isObj(a) && isObj(b)) {
    for (const k of [...Object.keys(a), ...Object.keys(b).filter((x) => !(x in a))]) diffValue(`${path}.${k}`, a[k], b[k], push);
    return;
  }
  if (!Object.is(a, b)) push(path, a, b);
}

export function compare(expected: Result[], actual: Result[]): Difference[] {
  const out: Difference[] = [];
  const byKey = new Map(actual.map((r) => [r.key, r]));
  const seen = new Set<string>();
  for (const a of expected) {
    const b = byKey.get(a.key);
    seen.add(a.key);
    if (b === undefined) {
      out.push({ label: a.key, field: 'missing', expected: a.status, actual: undefined });
      continue;
    }
    const push = (field: string, e: unknown, g: unknown): void => {
      out.push({ label: a.key, field, expected: e, actual: g });
    };
    diffValue('status', a.status, b.status, push);
    for (const name of [...new Set([...Object.keys(a.headers), ...Object.keys(b.headers)])].sort()) {
      diffValue(`headers.${name}`, a.headers[name], b.headers[name], push);
    }
    if ('json' in a.body && 'json' in b.body) diffValue('body', a.body.json, b.body.json, push);
    else if ('text' in a.body && 'text' in b.body) diffValue('body', a.body.text, b.body.text, push);
    else if ('sha256' in a.body && 'sha256' in b.body) {
      diffValue('body.bytes', a.body.bytes, b.body.bytes, push);
      diffValue('body.sha256', a.body.sha256, b.body.sha256, push);
    } else push('body', a.body, b.body);
  }
  for (const b of actual) if (!seen.has(b.key)) out.push({ label: b.key, field: 'extra', expected: undefined, actual: b.status });
  return out;
}

const show = (v: unknown): string => {
  const text = JSON.stringify(v) ?? 'undefined';
  return text.length > 120 ? text.slice(0, 117) + '...' : text;
};
export function formatDifferences(diffs: Difference[]): string {
  if (diffs.length === 0) return 'no differences';
  return diffs.map((d) => `${d.label}: ${d.field}: expected ${show(d.expected)} but got ${show(d.actual)}`).join('\n');
}

// Results whose status differs from the status hint of their step.
export function hintMisses(results: Result[]): Result[] {
  return results.filter((r) => r.expectedStatus !== undefined && r.status !== r.expectedStatus);
}
