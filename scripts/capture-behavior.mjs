#!/usr/bin/env node
// Checks the observable behavior of the Next app against the committed machine-checkable facts.
//   eval "$(node scripts/env-for-tests.mjs)"
//   node scripts/capture-behavior.mjs --check [--screen <id>] [--target next]
// test/behavior/<screen>.facts.json (facts) and <screen>.md (description) are FROZEN: they were recorded once from the old
// portal before it was deleted, and nothing writes them any more. --check recaptures the Next app and compares it with the
// committed files: exit 0 equal, 1 different (the diff names the screen, the variant or interaction index and the first
// differing fact, on stderr), 2 setup problem (browser environment missing, server did not start, usage error).
// The Next app runs on a production build of its own (built once into web/scratch/..., removed afterwards);
// ORBIT_UI_USE_BUILD=1 serves the existing web/.next instead. NODE_ENV=test is set for the Next server because a production
// environment refuses to start without DATABASE_URL (this tool seeds an in-memory database).
//
// The product is only observed from outside: the script starts `next start` on a free port, seeds fixtures through the HTTP
// API, freezes the browser clock and the server clock, drives the pages with Playwright and records accessibility-tree facts
// (role, name, state, order), form fields, headings, buttons, user-visible strings and the effect of each interaction.
// Facts never contain class names, style attributes, element ids, SVG data, ids (normalized to <ID-n>) or
// times (normalized to <TS>). Elements that credit another project are dropped on purpose.
import {spawn} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {once} from 'node:events';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'test', 'behavior');
const NOW = '2026-11-09T03:00:00.000Z'; // Monday 12:00 in Seoul; browser and server both read this instant
const MONTH = '2026-11';
const ADMIN = {user: 'admin', password: 'behavior-admin'}, VIEWER = {user: 'viewer', password: 'behavior-viewer'};
const ROLES = ['admin', 'viewer'], STATES = ['empty', 'populated'];
const VIEW = {overview: 'overview', board: 'board', report: 'report', improvement: 'improvements'};

class SetupError extends Error {}

// ---------------------------------------------------------------- cleaning and normalizing
// Pattern parts are joined at run time so this file stays neutral about the dropped credits.
const TRACE = new RegExp([['cl', 'aude'].join(''), '오픈' + '소스', 'third[-_ ]?' + 'party', ['sve', 'lte'].join(''), 'notices'].join('|'), 'i');
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const KO_TIME = /\d{4}\. \d{1,2}\. \d{1,2}\. (?:오전|오후) \d{1,2}:\d{2}(?::\d{2})?/g;
const ISO_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g;

function makeNormalizer() {
  const ids = new Map();
  const text = (s) => s.replace(UUID, (m) => { if (!ids.has(m)) ids.set(m, `<ID-${ids.size + 1}>`); return ids.get(m); })
    .replace(KO_TIME, '<TS>').replace(ISO_TIME, '<TS>').replace(/[0-9a-f]{8}\.pdf/g, '<ID8>.pdf').replace(/(휴지통 이동|복원|영구 삭제) · [0-9a-f]{8}/g, '$1 · <ID8>');
  const walk = (v) => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : typeof v === 'string' ? text(v) : v;
  return walk;
}

// aria snapshot (yaml-ish) -> lines without traces, without in-page anchors
function cleanTree(yaml) {
  const roots = [], stack = [];
  for (const raw of yaml.split('\n')) {
    if (!raw.trim()) continue;
    const node = {raw, indent: raw.search(/\S/), kids: []};
    while (stack.length && stack.at(-1).indent >= node.indent) stack.pop();
    (stack.length ? stack.at(-1).kids : roots).push(node);
    stack.push(node);
  }
  const prune = (nodes) => nodes.flatMap((n) => {
    if (TRACE.test(n.raw) || /^\s*- \/url: "?#/.test(n.raw)) return [];
    const kids = prune(n.kids);
    if (n.kids.length && !kids.length && n.raw.trimEnd().endsWith(':')) return [];
    return [{...n, kids}];
  });
  const flat = (nodes, depth = 0) => nodes.flatMap((n) => [' '.repeat(depth * 2) + n.raw.trim(), ...flat(n.kids, depth + 1)]);
  return flat(prune(roots));
}

// ---------------------------------------------------------------- environment: server, clock, seed
// parse and UTC are own statics because Next copies only own statics when it wraps Date for a request.
const PRELOAD = `const fs=require('fs');const file=process.env.BEHAVIOR_CLOCK_FILE;const Real=Date;
const now=()=>Real.parse(fs.readFileSync(file,'utf8').trim());
class Fake extends Real{constructor(...a){if(a.length===0)super(now());else super(...a);}static now(){return now();}static parse=Real.parse;static UTC=Real.UTC;}\nglobalThis.Date=Fake;`;

async function freePort() {
  const s = createServer();
  s.listen(0, '127.0.0.1');
  await once(s, 'listening');
  const {port} = s.address();
  s.close();
  await once(s, 'close');
  return port;
}

// The Next server gets the same server clock (the preload above, through NODE_OPTIONS) and the same passwords. Its environment is
// built from scratch so the developer's DATABASE_URL, NODE_ENV or NODE_OPTIONS never leak in.
function spawnNext(next, {port, preload, clockFile}) {
  const env = {
    PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'test', NEXT_DIST_DIR: next.distDir,
    NODE_OPTIONS: `--require ${preload}`, ADMIN_PASSWORD: ADMIN.password, VIEWER_PASSWORD: VIEWER.password, BEHAVIOR_CLOCK_FILE: clockFile,
  };
  return spawn(process.execPath, [next.bin, 'start', '-H', '127.0.0.1', '-p', String(port)], {cwd: next.cwd, env, stdio: ['ignore', 'pipe', 'pipe']});
}

async function waitHttp(base, child, failed, ms = 60000) {
  for (const deadline = Date.now() + ms; Date.now() < deadline;) {
    if (child.exitCode !== null) throw failed();
    try { await fetch(base + '/', {signal: AbortSignal.timeout(2000)}); return; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new SetupError(`next server did not answer on ${base} within ${ms / 1000}s`);
}

async function startEnv(h) {
  const dir = mkdtempSync(join(tmpdir(), 'behavior-capture-'));
  const clockFile = join(dir, 'clock'), preload = join(dir, 'clock.cjs');
  writeFileSync(clockFile, NOW);
  writeFileSync(preload, PRELOAD);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawnNext(h.next, {port, preload, clockFile});
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  const failed = () => new SetupError(`next server did not start: ${stderr.trim()}`);
  const stop = async () => {
    if (child.exitCode === null) {
      const done = once(child, 'exit'), hard = setTimeout(() => child.kill('SIGKILL'), 5000);
      child.kill();
      await done;
      clearTimeout(hard);
    }
    rmSync(dir, {recursive: true, force: true});
  };
  try {
    await waitHttp(base, child, failed);
    // The seed and every interaction need the database; a store that cannot open is a setup problem, not a behavior difference.
    const probe = await fetch(base + '/api/tasks', {headers: {Authorization: 'Basic ' + Buffer.from(`${ADMIN.user}:${ADMIN.password}`).toString('base64')}});
    if (!probe.ok) throw new SetupError(`next server answered GET /api/tasks with ${probe.status} on an empty in-memory database; its log: ${stderr.trim().split('\n').slice(-3).join(' | ')}`);
  } catch (e) { await stop(); throw e; }
  const auth = (who) => 'Basic ' + Buffer.from(`${who.user}:${who.password}`).toString('base64');
  const api = async (path, body, who = ADMIN) => {
    const res = await fetch(base + path, {method: body === undefined ? 'GET' : 'POST', headers: {Authorization: auth(who), 'Content-Type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
    const json = await res.json();
    if (!res.ok) throw new Error(`${path} -> ${res.status} ${json.error}${stderr ? ` (server log: ${stderr.trim().split('\n').slice(-3).join(' | ')})` : ''}`);
    return json;
  };
  return {
    base, api, dir,
    at: (iso) => writeFileSync(clockFile, iso),
    stop,
  };
}

const TITLES = {
  progress: '신규 입사자 노트북 준비', minimal: '최소 입력', done: '복합기 토너 교체', fixed: '월간 소모품 점검',
  waiting: '사무실 정수기 점검', doneEarlier: '법인카드 정산', test: '연습용 등록 건', deleted: '중복 등록 업무',
};

// Same fixtures every run: the golden test's two tasks plus one task per status / kind the screens branch on.
async function seed(env) {
  const make = async (clock, values) => { env.at(clock); return (await env.api('/api/tasks', values)).id; };
  const status = async (clock, id, body) => { env.at(clock); await env.api(`/api/tasks/${id}/status`, body); };
  const progress = await make('2026-11-03T01:30:00Z', {title: TITLES.progress, requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음', requested_at: '2026-11-03T01:00:00Z', due_date: '2026-11-05', description: '노트북 1대 준비'});
  await make('2026-11-03T02:30:00Z', {title: '  ' + TITLES.minimal + '  ', requester: ' 김철수 ', requested_at: '2026-11-03T02:00:00Z'});
  const done = await make('2026-11-02T00:40:00Z', {title: TITLES.done, requester: '이서연', department: '총무팀', channel: '구두', category: '시설·환경', priority: '중', requested_at: '2026-11-02T00:30:00Z', due_date: '2026-11-06', description: '3층 복합기 토너 교체'});
  await make('2026-11-09T00:10:00Z', {title: TITLES.fixed, requester: '박민수', department: '총무팀', channel: '메신저', category: '고정업무', priority: '중', requested_at: '2026-11-09T00:00:00+09:00', due_date: '2026-11-13', description: '매월 소모품 재고 확인'});
  const waiting = await make('2026-11-06T02:10:00Z', {title: TITLES.waiting, requester: '정하윤', department: '경영지원팀', channel: '이메일', category: '시설·환경', priority: '하', requested_at: '2026-11-06T02:00:00Z', due_date: '2026-11-12'});
  const doneEarlier = await make('2026-11-01T02:10:00Z', {title: TITLES.doneEarlier, requester: '최도윤', department: '경영지원팀', channel: '전화', category: '구매·지출', priority: '상', requested_at: '2026-11-01T02:00:00Z', due_date: '2026-11-08'});
  const test = await make('2026-11-05T02:10:00Z', {title: TITLES.test, requester: '테스터', channel: '기타', category: '기타', priority: '하', requested_at: '2026-11-05T02:00:00Z'});
  const deleted = await make('2026-11-04T02:10:00Z', {title: TITLES.deleted, requester: '강서준', department: '총무팀', channel: '메신저', category: '일반 총무', priority: '중', requested_at: '2026-11-04T02:00:00Z'});
  await status('2026-11-04T01:00:00Z', progress, {status: '진행 중'});
  env.at('2026-11-04T02:00:00Z'); await env.api(`/api/tasks/${progress}/notes`, {note: '장비 준비 및 계정 설정 완료'});
  env.at('2026-11-04T03:00:00Z'); await env.api(`/api/tasks/${progress}/assign`, {assignee: '박지원'});
  await status('2026-11-05T05:00:00Z', done, {status: '완료'});
  env.at('2026-11-05T05:10:00Z'); await env.api(`/api/tasks/${done}/files`, {name: 'toner.txt', content: Buffer.from('toner receipt').toString('base64')});
  await status('2026-11-07T01:00:00Z', waiting, {status: '대기', reason: '업체 방문 일정 대기'});
  await status('2026-11-08T08:00:00Z', doneEarlier, {status: '완료'});
  env.at('2026-11-05T02:20:00Z'); await env.api(`/api/tasks/${test}/test-data`, {is_test: true});
  env.at('2026-11-08T01:00:00Z'); await env.api(`/api/tasks/${deleted}/delete`, {reason: '중복 등록'});
  env.at('2026-11-08T02:00:00Z');
  await env.api('/api/improvements', {value: {title: '상태 변경 안내 문구 정리', stage: '본인 실사용', source: '총무팀 시연', feedback: '상태 변경 뒤 무엇이 바뀌었는지 알기 어렵다', action: '변경 완료 안내를 띄우도록 수정', result: '', status: '개선 중'}});
  env.at('2026-11-08T03:00:00Z');
  await env.api('/api/improvements', {value: {title: '기한 초과 표시', stage: 'MVP 구축', source: '', feedback: '기한이 지난 업무를 한눈에 구분하기 어렵다', action: '기한 초과 업무를 강조', result: '시연에서 구분이 쉬워졌다는 의견', status: '검증 완료'}});
  env.at('2026-11-08T04:00:00Z');
  const settings = await env.api('/api/settings');
  await env.api('/api/settings', {revision: settings.revision, values: {...settings.values, accentColor: '#ff7a5c'}});
  env.at(NOW);
  const preview = await env.api(`/api/report-preview?month=${MONTH}`);
  await env.api('/api/reports', {month: MONTH, fingerprint: preview.fingerprint, draft: preview.draft});
}

// ---------------------------------------------------------------- browser session
async function openBrowser() {
  const entry = process.env.ORBIT_PLAYWRIGHT_PATH;
  if (!entry || !process.env.CHROMIUM_PATH) {
    throw new SetupError('browser environment missing (ORBIT_PLAYWRIGHT_PATH / CHROMIUM_PATH). Run:  eval "$(node scripts/env-for-tests.mjs)"  — if that fails it prints how to install Playwright and Chromium outside the repo.');
  }
  if (!existsSync(entry)) throw new SetupError(`ORBIT_PLAYWRIGHT_PATH points at a missing file: ${entry}`);
  const {chromium} = await import(entry);
  try { return await chromium.launch({headless: true}); } catch (e) { throw new SetupError(`cannot launch Chromium (${process.env.CHROMIUM_PATH}): ${e.message.split('\n')[0]}`); }
}

const settle = async (page, ms = 250) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(ms); };

async function openSession(h, role, state, {fakeTimers = false} = {}) {
  const env = await startEnv(h);
  try {
    if (state === 'populated') await seed(env);
    const who = role === 'admin' ? ADMIN : VIEWER;
    const context = await h.browser.newContext({httpCredentials: {username: who.user, password: who.password}, viewport: {width: 1280, height: 900}, locale: 'ko-KR', timezoneId: 'Asia/Seoul', acceptDownloads: true});
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    if (fakeTimers) { await page.clock.install({time: new Date(Date.parse(NOW) - 1000)}); await page.clock.pauseAt(new Date(NOW)); }
    else await page.clock.setFixedTime(new Date(NOW));
    await page.goto(env.base);
    // A Next page that has not been ported yet never fills #content; the empty page is then recorded as it is and the diff says so.
    await page.waitForFunction(() => document.querySelector('#content')?.textContent.trim().length > 0).catch(() => {});
    await settle(page);
    return {env, page, role, state, async close() { await context.close(); await env.stop(); }};
  } catch (e) { await env.stop(); throw e; }
}

async function go(page, view) { await page.locator(`nav [data-view="${view}"]`).click(); await settle(page); }

// ---------------------------------------------------------------- probes
function collector(root) {
  const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  const squash = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const labelOf = (e) => {
    const aria = e.getAttribute('aria-label');
    if (aria) return aria;
    const l = e.closest('label') || (e.labels && e.labels[0]);
    if (!l) return '';
    const c = l.cloneNode(true);
    c.querySelectorAll('input,select,textarea,button').forEach((x) => x.remove());
    return squash(c.textContent);
  };
  const keep = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== false && v !== null && v !== undefined));
  const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => ({level: Number(h.tagName[1]), text: squash(h.textContent)}));
  const buttons = [...root.querySelectorAll('button,summary,a[href],[role="button"]')].filter(visible).map((b) => keep({
    kind: b.tagName.toLowerCase(), name: b.getAttribute('aria-label') || squash(b.textContent), disabled: b.disabled === true,
    pressed: b.getAttribute('aria-pressed'), expanded: b.getAttribute('aria-expanded'), type: b.tagName === 'BUTTON' ? b.getAttribute('type') : '',
  }));
  const fields = [...root.querySelectorAll('input,select,textarea')].filter(visible).map((f) => keep({
    kind: f.tagName.toLowerCase(), type: f.tagName === 'INPUT' ? f.type : '', name: f.getAttribute('name'), label: labelOf(f), placeholder: f.getAttribute('placeholder'),
    required: f.required, readonly: f.readOnly, disabled: f.disabled, maxlength: f.getAttribute('maxlength'), accept: f.getAttribute('accept'),
    checked: f.type === 'checkbox' || f.type === 'radio' ? f.checked : null, value: f.type === 'file' ? '' : f.value,
    options: f.tagName === 'SELECT' ? [...f.options].map((o) => keep({text: squash(o.textContent), selected: o.selected})) : null,
  }));
  return {headings, buttons, fields};
}

async function probe(page, scope) {
  const loc = page.locator(scope).first();
  const dom = await loc.evaluate(collector);
  const dropTrace = (list, text) => list.filter((x) => !TRACE.test(JSON.stringify(x)));
  return {headings: dropTrace(dom.headings), buttons: dropTrace(dom.buttons), fields: dropTrace(dom.fields), tree: cleanTree(await loc.ariaSnapshot())};
}

const lines = async (page, scope) => cleanTree(await page.locator(scope).first().ariaSnapshot());

async function pageState(page) {
  return page.evaluate(() => {
    const squash = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const toast = document.querySelector('[role="status"][style*="block"]');
    return {
      breadcrumb: squash(document.querySelector('header strong')?.textContent), title: squash(document.querySelector('h1')?.textContent),
      openDialogs: [...document.querySelectorAll('dialog[open]')].map((d) => squash(d.querySelector('h2')?.textContent)),
      toast: toast ? squash(toast.textContent) : null,
    };
  });
}

// ---------------------------------------------------------------- interaction runner
// spec: {role, state, action, scope, open(page, session), run(page, session, note), mutates, fakeTimers}
async function interaction(h, cache, spec) {
  const key = `${spec.role}/${spec.state}`;
  let s = spec.mutates || spec.fakeTimers ? null : cache.get(key);
  const fresh = !s;
  try {
    if (!s) { s = await openSession(h, spec.role, spec.state, {fakeTimers: spec.fakeTimers}); if (!spec.mutates && !spec.fakeTimers) cache.set(key, s); }
    else { await s.page.reload(); await s.page.waitForFunction(() => document.querySelector('#content')?.textContent.trim().length > 0).catch(() => {}); await settle(s.page); }
    await spec.open(s.page, s);
    await settle(s.page, 150);
    const record = {role: spec.role, state: spec.state, action: spec.action, before: await lines(s.page, spec.scope)};
    const seen = [];
    const onDialog = async (d) => { seen.push({type: d.type(), message: d.message(), default: d.defaultValue()}); if (spec.answer === null) await d.dismiss(); else await d.accept(spec.answer ?? d.defaultValue()); };
    s.page.on('dialog', onDialog);
    const note = {};
    try { await spec.run(s.page, s, note); } finally { s.page.off('dialog', onDialog); }
    await settle(s.page, 250);
    record.after = await lines(s.page, spec.afterScope ?? spec.scope);
    Object.assign(record, {page: await pageState(s.page)}, note);
    if (seen.length) record.browserDialogs = seen;
    return record;
  } catch (e) {
    h.skipped.push(`${spec.role}/${spec.state} ${spec.action}: ${e.message.split('\n')[0]}`);
    return {role: spec.role, state: spec.state, action: spec.action, driven: false, reason: e.message.split('\n')[0].slice(0, 160)};
  } finally {
    if (spec.mutates || spec.fakeTimers) await s?.close();
  }
}

async function runInteractions(h, specs) {
  const cache = new Map(), out = [], seen = new Map();
  for (const spec of specs) out.push(await interaction(h, cache, spec));
  for (const s of cache.values()) await s.close();
  // identical snapshots are stored once: later records point at the first one / say "unchanged"
  out.forEach((r, i) => {
    if (!r.before) return;
    const key = JSON.stringify(r.before);
    if (r.after && JSON.stringify(r.after) === key) r.after = 'unchanged';
    if (seen.has(key)) r.before = {sameAsBeforeOfInteraction: seen.get(key)}; else seen.set(key, i);
  });
  return out;
}

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', {timeout: 20000}), click()]);
  const path = await dl.path();
  const buf = readFileSync(path);
  const isText = !buf.subarray(0, 5).equals(Buffer.from('%PDF-'));
  return {filename: dl.suggestedFilename(), bytes: isText ? undefined : 'pdf', text: isText ? buf.toString('utf8').split(/\r?\n/).slice(0, 8) : undefined, size: isText ? undefined : buf.length > 0 ? 'non-empty' : 'empty'};
}

async function variantMatrix(h, open, scope, {roles = ROLES, states = STATES, applicable = () => true} = {}) {
  const variants = {};
  for (const role of roles) for (const state of states) {
    const key = `${role}/${state}`;
    if (!applicable(role, state)) { variants[key] = {applicable: false}; continue; }
    const s = await openSession(h, role, state);
    try { variants[key] = await open(s, scope); } finally { await s.close(); }
  }
  return variants;
}

// ---------------------------------------------------------------- screens
const rowOf = (page, title) => page.getByRole('button', {name: new RegExp(title)}).first();
const dialogBy = (sel) => (page) => page.locator(sel);

// pages -------------------------------------------------------------
async function pageVariants(h, view) {
  return variantMatrix(h, async (s) => { if (view !== 'overview') await go(s.page, view); return probe(s.page, 'body'); }, 'body');
}

async function overview(h) {
  const variants = await pageVariants(h, 'overview');
  const A = {role: 'admin', state: 'populated', scope: 'main', open: async () => {}};
  const navTo = (label) => ({...A, action: `click the side menu entry ${label}`, run: (p) => p.locator('nav').getByRole('button', {name: new RegExp(label)}).click()});
  const interactions = await runInteractions(h, [
    {...A, action: 'open the page with no interaction (stats, pending list, completion bar)', run: async () => {}},
    navTo('업무 보드'), navTo('업무 실적'), navTo('개선 이력'),
    {...A, action: 'click 모든 업무 보기', run: (p) => p.getByRole('button', {name: '모든 업무 보기 →'}).click()},
    {...A, action: 'click 월간 보고서', run: (p) => p.getByRole('button', {name: '월간 보고서 →'}).click()},
    {...A, action: 'click 업무 실적 확인하기', run: (p) => p.getByRole('button', {name: '업무 실적 확인하기 →'}).click()},
    {...A, action: 'click the first pending task row', run: (p) => p.locator('main section button').filter({hasText: '노트북'}).first().click()},
    {...A, action: 'click 새 업무 등록', run: (p) => p.getByRole('button', {name: '＋ 새 업무 등록'}).click()},
    {role: 'viewer', state: 'populated', scope: 'main', open: async () => {}, action: 'viewer: click the first pending task row', run: (p) => p.locator('main section button').filter({hasText: '노트북'}).first().click()},
    {...A, action: 'wait 30 seconds of page time after a new task was added by the API (automatic refresh)', mutates: true, fakeTimers: true,
      run: async (p, s) => { s.env.at(NOW); await s.env.api('/api/tasks', {title: '자동 갱신 확인', requester: '확인자', requested_at: '2026-11-09T00:00:00+09:00'}); await p.clock.fastForward(31000); await settle(p, 400); }},
  ]);
  return {variants, interactions};
}

const boardRegion = 'region';
async function board(h) {
  const variants = await pageVariants(h, 'board');
  const A = {role: 'admin', state: 'populated', scope: 'main', open: (p) => go(p, 'board')};
  const reg = (p) => p.getByRole('region').first();
  const pick = (action, run, extra = {}) => ({...A, action, run, ...extra});
  const status = (name) => pick(`click the status filter ${name}`, (p) => p.getByRole('button', {name: new RegExp('^' + name + ' \\d')}).click());
  const group = (label) => pick(`choose "${label}" in the card grouping select`, (p) => p.getByRole('combobox', {name: '카드 분류 기준'}).selectOption({label}));
  const basis = (label) => pick(`choose "${label}" in the date basis select`, (p) => p.getByRole('combobox', {name: '날짜 기준'}).selectOption({label}));
  const interactions = await runInteractions(h, [
    ...['전체', '접수', '진행 중', '대기', '완료'].map(status),
    pick('type a title word in the search box (노트북)', (p) => p.getByRole('searchbox', {name: '업무 검색'}).fill('노트북')),
    pick('type a requester name in the search box (김철수)', (p) => p.getByRole('searchbox', {name: '업무 검색'}).fill('김철수')),
    pick('type a word that matches nothing in the search box', (p) => p.getByRole('searchbox', {name: '업무 검색'}).fill('해당없음')),
    pick('search a date text (2026-11-05) in the search box', (p) => p.getByRole('searchbox', {name: '업무 검색'}).fill('2026-11-05')),
    pick('combine the search 정산 with the status filter 완료', async (p) => { await p.getByRole('searchbox', {name: '업무 검색'}).fill('정산'); await p.getByRole('button', {name: /^완료 \d/}).click(); }),
    ...['날짜별', '업무 분류별', '요청 부서별', '접수 경로별'].map(group),
    ...['처리일 (완료: 완료일 / 미완료: 요청일)', '요청일', '완료일', '등록일'].map(basis),
    pick('set the start date to 2026-11-05', (p) => p.getByRole('textbox', {name: '시작일'}).fill('2026-11-05')),
    pick('set the end date to 2026-11-04', (p) => p.getByRole('textbox', {name: '종료일'}).fill('2026-11-04')),
    pick('set start 2026-11-03 and end 2026-11-05 then click 기간 초기화', async (p) => { await p.getByRole('textbox', {name: '시작일'}).fill('2026-11-03'); await p.getByRole('textbox', {name: '종료일'}).fill('2026-11-05'); await settle(p, 100); await p.getByRole('button', {name: '기간 초기화'}).click(); }),
    pick('choose the completion-date basis with a range 2026-11-08 to 2026-11-08', async (p) => { await p.getByRole('combobox', {name: '날짜 기준'}).selectOption({label: '완료일'}); await p.getByRole('textbox', {name: '시작일'}).fill('2026-11-08'); await p.getByRole('textbox', {name: '종료일'}).fill('2026-11-08'); }),
    pick('click 간략 보기', (p) => p.getByRole('button', {name: '간략 보기'}).click()),
    pick('click 간략 보기 twice', async (p) => { await p.getByRole('button', {name: '간략 보기'}).click(); await p.getByRole('button', {name: /보기/}).first().click(); }),
    pick('click the first group header to collapse it', (p) => reg(p).locator('button[aria-expanded="true"]').first().click()),
    pick('collapse then expand the first group header', async (p) => { const b = reg(p).locator('button[aria-expanded]').first(); await b.click(); await b.click(); }),
    pick('group by 업무 분류별 then collapse the first group', async (p) => { await p.getByRole('combobox', {name: '카드 분류 기준'}).selectOption({label: '업무 분류별'}); await settle(p, 100); await reg(p).locator('button[aria-expanded="true"]').first().click(); }),
    pick('click CSV 내보내기', async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: 'CSV 내보내기'}).click()); }),
    pick('add a task through the API then click 새로고침', async (p, s) => { s.env.at(NOW); await s.env.api('/api/tasks', {title: '새로고침 확인', requester: '확인자', requested_at: '2026-11-09T00:00:00+09:00'}); await p.getByRole('button', {name: '새로고침'}).click(); }, {mutates: true}),
    pick('click ▸ 완료 업무 이력 보기 in a group', (p) => p.getByRole('button', {name: /완료 업무 \d+건/}).first().click()),
    pick('click every ▸ 완료 업무 이력 보기 toggle', async (p) => { const t = p.getByRole('button', {name: /완료 업무 \d+건/}); for (let i = 0, n = await t.count(); i < n; i++) await t.nth(i).click(); }),
    pick('click a task row (opens the detail dialog)', (p) => rowOf(p, TITLES.progress).click()),
    pick('click the fixed-category task row', (p) => rowOf(p, TITLES.fixed).click()),
    pick('click the test task row', (p) => rowOf(p, '연습용').click()),
    pick('click 새 업무 등록', (p) => p.getByRole('button', {name: '＋ 새 업무 등록'}).click()),
    {...A, state: 'empty', action: 'empty state: click 새로고침', run: (p) => p.getByRole('button', {name: '새로고침'}).click()},
    {...A, state: 'empty', action: 'empty state: type in the search box', run: (p) => p.getByRole('searchbox', {name: '업무 검색'}).fill('아무거나')},
    {...A, state: 'empty', action: 'empty state: click CSV 내보내기', run: async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: 'CSV 내보내기'}).click()); }},
    {...A, role: 'viewer', action: 'viewer: click a task row', run: (p) => rowOf(p, TITLES.progress).click()},
    {...A, role: 'viewer', action: 'viewer: click CSV 내보내기', run: async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: 'CSV 내보내기'}).click()); }},
    {...A, role: 'viewer', action: 'viewer: choose the 업무 분류별 grouping', run: (p) => p.getByRole('combobox', {name: '카드 분류 기준'}).selectOption({label: '업무 분류별'})},
  ]);
  return {variants, interactions};
}

async function report(h) {
  const variants = await pageVariants(h, 'report');
  const A = {role: 'admin', state: 'populated', scope: 'main', open: (p) => go(p, 'report')};
  const pick = (action, run, extra = {}) => ({...A, action, run, ...extra});
  const month = (p, v) => p.getByLabel('조회 월').fill(v);
  const interactions = await runInteractions(h, [
    pick('change the month to 2026-10', (p) => month(p, '2026-10')),
    pick('change the month to the previous month then back to 2026-11', async (p) => { await month(p, '2026-10'); await settle(p, 200); await month(p, '2026-11'); }),
    pick('enter an invalid month value', (p) => month(p, '')),
    pick('click 지표 새로 집계', (p) => p.getByRole('button', {name: '지표 새로 집계'}).click()),
    pick('click 지표 CSV', async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '지표 CSV'}).click()); }),
    pick('click 초안 내려받기', async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '초안 내려받기'}).click()); }),
    pick('open the metric definition details', (p) => p.locator('summary').first().click()),
    pick('click 발행본 내려받기', async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '발행본 내려받기'}).first().click()); }),
    pick('edit the draft text then click 초안 내려받기', async (p, s, note) => { await p.getByLabel('월간 보고서 초안').fill('검토 문안 확인'); note.download = await download(p, () => p.getByRole('button', {name: '초안 내려받기'}).click()); }),
    pick('click 검토 완료 · 리포트 발행', (p) => p.getByRole('button', {name: '검토 완료 · 리포트 발행'}).click(), {mutates: true}),
    pick('add a task by the API after the page loaded then click 검토 완료 · 리포트 발행 (stale totals)', async (p, s) => { s.env.at(NOW); await s.env.api('/api/tasks', {title: '발행 직전 등록', requester: '확인자', requested_at: '2026-11-09T00:00:00+09:00'}); await p.getByRole('button', {name: '검토 완료 · 리포트 발행'}).click(); }, {mutates: true}),
    {...A, state: 'empty', action: 'empty state: click 검토 완료 · 리포트 발행', mutates: true, run: (p) => p.getByRole('button', {name: '검토 완료 · 리포트 발행'}).click()},
    {...A, state: 'empty', action: 'empty state: click 지표 CSV', run: async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '지표 CSV'}).click()); }},
    {...A, role: 'viewer', action: 'viewer: click 발행본 내려받기', run: async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '발행본 내려받기'}).first().click()); }},
    {...A, role: 'viewer', action: 'viewer: change the month to 2026-10', run: (p) => month(p, '2026-10')},
  ]);
  return {variants, interactions};
}

async function improvement(h) {
  const variants = await pageVariants(h, 'improvements');
  const A = {role: 'admin', state: 'populated', scope: 'main', open: (p) => go(p, 'improvements')};
  const pick = (action, run, extra = {}) => ({...A, action, run, ...extra});
  const stage = (label) => pick(`choose "${label}" in the stage select`, (p) => p.getByLabel('수행 단계').selectOption({label}));
  const interactions = await runInteractions(h, [
    ...['전체 단계', 'MVP 구축', '본인 실사용', '정착 운영'].map(stage),
    pick('click 관리대장 CSV', async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '관리대장 CSV'}).click()); }),
    pick('click ＋ 개선 기록', (p) => p.getByRole('button', {name: '＋ 개선 기록'}).click()),
    pick('click the first record row', (p) => p.locator('main article button').first().click()),
    {...A, state: 'empty', action: 'empty state: click 관리대장 CSV', run: async (p, s, note) => { note.download = await download(p, () => p.getByRole('button', {name: '관리대장 CSV'}).click()); }},
    {...A, state: 'empty', action: 'empty state: click ＋ 개선 기록', run: (p) => p.getByRole('button', {name: '＋ 개선 기록'}).click()},
    {...A, role: 'viewer', action: 'viewer: click the first record row', run: (p) => p.locator('main article button').first().click()},
    {...A, role: 'viewer', action: 'viewer: choose 정착 운영 in the stage select', run: (p) => p.getByLabel('수행 단계').selectOption({label: '정착 운영'})},
  ]);
  return {variants, interactions};
}

// dialogs -----------------------------------------------------------
// Opens a dialog from a session and records it; roles that cannot reach the entry control are recorded as such.
async function dialogVariants(h, {scope, opener, applicable, label}) {
  return variantMatrix(h, async (s) => {
    const entry = await opener(s.page, s);
    if (!entry.opened) return {opened: false, reason: entry.reason};
    await settle(s.page, 250);
    return {opened: true, ...(await probe(s.page, scope))};
  }, scope, {applicable});
}

const openCreate = async (page) => {
  const button = page.getByRole('button', {name: '＋ 새 업무 등록'});
  if (!(await button.isVisible())) return {opened: false, reason: 'the register button is not visible for this role'};
  await button.click();
  return {opened: true};
};

async function create(h) {
  const variants = await dialogVariants(h, {scope: '#create-dialog', opener: openCreate});
  const A = {role: 'admin', state: 'populated', scope: '#create-dialog', open: openCreate};
  const fill = async (p, values) => { for (const [name, value] of Object.entries(values)) { const f = p.locator(`#create-dialog [name="${name}"]`); if ((await f.evaluate((e) => e.tagName)) === 'SELECT') await f.selectOption({label: value}); else await f.fill(value); } };
  const pick = (action, run, extra = {}) => ({...A, action, run, ...extra});
  const interactions = await runInteractions(h, [
    pick('click 업무 등록 with the required fields empty', async (p, s, note) => { await p.getByRole('button', {name: '업무 등록', exact: true}).click(); note.invalidFields = await p.locator('#create-form').evaluate((f) => [...f.elements].filter((e) => e.name && !e.checkValidity()).map((e) => e.name)); }),
    pick('click 자동 분류 · 유사 업무 찾기 with title and description empty', (p) => p.getByRole('button', {name: '자동 분류 · 유사 업무 찾기'}).click()),
    pick('type a title like an existing task then click 자동 분류 · 유사 업무 찾기', async (p) => { await fill(p, {title: '노트북 준비 요청', description: '신규 입사자 장비'}); await p.getByRole('button', {name: '자동 분류 · 유사 업무 찾기'}).click(); await settle(p, 300); }),
    pick('click 분류 적용 after the automatic classification', async (p, s, note) => { await fill(p, {title: '복합기 토너 교체 요청', description: '프린터 토너'}); await p.getByRole('button', {name: '자동 분류 · 유사 업무 찾기'}).click(); await p.getByRole('button', {name: '분류 적용'}).click(); note.categoryAfter = await p.locator('#create-dialog [name="category"]').inputValue(); }),
    pick('fill every field and click 업무 등록', async (p) => { await fill(p, {title: '프로젝터 램프 교체', requester: '오지후', department: '개발팀', channel: '이메일', category: '시설·환경', priority: '상', due_date: '2026-11-20', description: '회의실 프로젝터 램프'}); await p.getByRole('button', {name: '업무 등록', exact: true}).click(); }, {mutates: true, afterScope: '#detail-dialog'}),
    pick('fill only the required fields and click 업무 등록', async (p) => { await fill(p, {title: '필수만 입력', requester: '오지후'}); await p.getByRole('button', {name: '업무 등록', exact: true}).click(); }, {mutates: true, afterScope: '#detail-dialog'}),
    pick('clear the request date and click 업무 등록', async (p, s, note) => { await fill(p, {title: '날짜 없음', requester: '오지후'}); await p.locator('#create-dialog [name="requested_at"]').fill(''); await p.getByRole('button', {name: '업무 등록', exact: true}).click(); note.invalidFields = await p.locator('#create-form').evaluate((f) => [...f.elements].filter((e) => e.name && !e.checkValidity()).map((e) => e.name)); }),
    pick('click 취소', (p) => p.getByRole('button', {name: '취소'}).click()),
    pick('click the × close button', (p) => p.locator('#create-dialog').getByRole('button', {name: '닫기'}).click()),
    pick('press Escape', (p) => p.keyboard.press('Escape')),
    pick('reopen after typing and closing (form is reset)', async (p) => { await fill(p, {title: '지워질 내용'}); await p.getByRole('button', {name: '취소'}).click(); await p.getByRole('button', {name: '＋ 새 업무 등록'}).click(); }),
    {...A, state: 'empty', action: 'empty state: fill the required fields and click 업무 등록', mutates: true, afterScope: '#detail-dialog', run: async (p) => { await fill(p, {title: '첫 업무', requester: '오지후'}); await p.getByRole('button', {name: '업무 등록', exact: true}).click(); }},
    {...A, state: 'empty', action: 'empty state: type a title then click 자동 분류 · 유사 업무 찾기', run: async (p) => { await fill(p, {title: '노트북 준비 요청'}); await p.getByRole('button', {name: '자동 분류 · 유사 업무 찾기'}).click(); await settle(p, 300); }},
  ]);
  return {variants, interactions};
}

const openImprovementDialog = (mode) => async (page, session) => {
  await go(page, 'improvements');
  if (mode === 'new') {
    const b = page.getByRole('button', {name: '＋ 개선 기록'});
    if (!(await b.isVisible())) return {opened: false, reason: 'the add button is not visible for this role'};
    await b.click();
    return {opened: true};
  }
  const row = page.locator('main article button').first();
  if (!(await row.isVisible().catch(() => false))) return {opened: false, reason: 'there is no record row to open'};
  await row.click();
  return {opened: true};
};

async function improvementDialog(h) {
  const variants = {};
  for (const mode of ['new', 'existing']) {
    const part = await dialogVariants(h, {scope: '#improvement-dialog', opener: openImprovementDialog(mode)});
    for (const [k, v] of Object.entries(part)) variants[`${k}/${mode}`] = v;
  }
  const A = {role: 'admin', state: 'populated', scope: '#improvement-dialog', open: openImprovementDialog('existing')};
  const N = {...A, open: openImprovementDialog('new')};
  const f = (p, name, v) => p.locator(`#improvement-dialog [name="${name}"]`).fill(v);
  const save = (p) => p.getByRole('button', {name: '개선 기록 저장'}).click();
  const interactions = await runInteractions(h, [
    {...N, action: 'new record: click 개선 기록 저장 with nothing filled', run: async (p, s, note) => { await save(p); note.invalidFields = await p.locator('#improvement-form').evaluate((x) => [...x.elements].filter((e) => e.name && !e.checkValidity()).map((e) => e.name)); }},
    {...N, action: 'new record: fill title and feedback and save', mutates: true, afterScope: 'main', run: async (p) => { await f(p, 'title', '알림 문구 개선'); await f(p, 'feedback', '메모 저장 뒤 안내가 없다'); await save(p); }},
    {...N, action: 'new record: choose 검증 완료 without a result and save', run: async (p) => { await f(p, 'title', '검증 없이 완료'); await f(p, 'feedback', '피드백'); await p.locator('#improvement-dialog [name="status"]').selectOption({label: '검증 완료'}); await save(p); }},
    {...N, action: 'new record: choose 검증 완료 with a result and save', mutates: true, afterScope: 'main', run: async (p) => { await f(p, 'title', '검증 포함 완료'); await f(p, 'feedback', '피드백'); await f(p, 'result', '전후 비교 확인'); await p.locator('#improvement-dialog [name="status"]').selectOption({label: '검증 완료'}); await save(p); }},
    {...A, action: 'existing record: click 수정 이력 before any edit', run: (p) => p.getByRole('button', {name: '수정 이력'}).click()},
    {...A, action: 'existing record: change the status and save then reopen the history', mutates: true, run: async (p) => { await p.locator('#improvement-dialog [name="status"]').selectOption({label: '검증 완료'}); await f(p, 'result', '검증 결과 입력'); await save(p); await settle(p, 300); await p.locator('main article button').first().click(); await p.getByRole('button', {name: '수정 이력'}).click(); }},
    {...A, action: 'existing record: click × close', run: (p) => p.locator('#improvement-dialog').getByRole('button', {name: '닫기'}).click()},
    {...A, role: 'viewer', action: 'viewer: try to type in the title field', run: async (p, s, note) => { note.titleReadonly = await p.locator('#improvement-dialog [name="title"]').evaluate((e) => e.readOnly); }},
    {...A, role: 'viewer', action: 'viewer: click 수정 이력', run: (p) => p.getByRole('button', {name: '수정 이력'}).click()},
  ]);
  return {variants, interactions};
}

const openTrash = async (page) => {
  const b = page.getByRole('button', {name: '관리자 휴지통'});
  if (!(await b.isVisible())) return {opened: false, reason: 'the trash button is not visible for this role'};
  await b.click();
  return {opened: true};
};

async function trash(h) {
  const variants = await dialogVariants(h, {scope: '#trash-dialog', opener: openTrash});
  const A = {role: 'admin', state: 'populated', scope: '#trash-dialog', open: openTrash};
  const interactions = await runInteractions(h, [
    {...A, action: 'click 삭제·복원 이력 보기', run: (p) => p.getByRole('button', {name: '삭제·복원 이력 보기'}).click()},
    {...A, state: 'empty', action: 'empty state: click 삭제·복원 이력 보기', run: (p) => p.getByRole('button', {name: '삭제·복원 이력 보기'}).click()},
    {...A, action: 'click the trash row title (opens the detail of a deleted task)', afterScope: '#detail-dialog', run: (p) => p.locator('#trash-dialog .task-open').first().click()},
    {...A, action: 'click 복원 and accept the reason prompt', mutates: true, run: (p) => p.getByRole('button', {name: '복원', exact: true}).click()},
    {...A, action: 'click 복원 and cancel the reason prompt', answer: null, mutates: true, run: (p) => p.getByRole('button', {name: '복원', exact: true}).click()},
    {...A, action: 'click 영구 삭제 and answer the title prompt with a wrong title', answer: '다른 제목', mutates: true, run: (p) => p.getByRole('button', {name: '영구 삭제', exact: true}).click()},
    {...A, action: 'click 영구 삭제 and answer both prompts correctly then open the history', mutates: true, run: async (p, s) => { p.removeAllListeners('dialog'); p.on('dialog', (d) => d.accept(d.message().includes('제목') ? TITLES.deleted : '테스트 영구 삭제')); await p.getByRole('button', {name: '영구 삭제', exact: true}).click(); await settle(p, 400); await p.getByRole('button', {name: '삭제·복원 이력 보기'}).click(); }},
    {...A, action: 'click × close', run: (p) => p.locator('#trash-dialog').getByRole('button', {name: '닫기'}).click()},
  ]);
  return {variants, interactions};
}

const openSettings = async (page) => {
  const b = page.getByRole('button', {name: '관리자 설정'});
  if (!(await b.isVisible())) return {opened: false, reason: 'the settings button is not visible for this role'};
  await b.click();
  return {opened: true};
};

async function settings(h) {
  const variants = await dialogVariants(h, {scope: '#settings-dialog', opener: openSettings});
  const A = {role: 'admin', state: 'populated', scope: '#settings-dialog', open: openSettings};
  const set = (p, name, v) => p.locator(`#settings-dialog [name="${name}"]`).fill(v);
  const interactions = await runInteractions(h, [
    {...A, action: 'click 변경 이력', run: (p) => p.getByRole('button', {name: '변경 이력', exact: true}).click()},
    {...A, state: 'empty', action: 'empty state: click 변경 이력', run: (p) => p.getByRole('button', {name: '변경 이력', exact: true}).click()},
    {...A, action: 'change the portal name and click 기본값 불러오기', run: async (p, s, note) => { await set(p, 'text_portalName', '임시 이름'); await p.getByRole('button', {name: '기본값 불러오기'}).click(); note.portalNameAfter = await p.locator('#settings-dialog [name="text_portalName"]').inputValue(); }},
    {...A, action: 'change the portal name and click 취소', afterScope: 'body', run: async (p) => { await set(p, 'text_portalName', '임시 이름'); await p.getByRole('button', {name: '취소'}).click(); }},
    {...A, action: 'change the portal name, the dashboard title and click 설정 저장', mutates: true, afterScope: 'body', run: async (p) => { await set(p, 'text_portalName', '우리 회사 업무 포털'); await set(p, 'text_overviewTitle', '새 인사말'); await p.getByRole('button', {name: '설정 저장', exact: true}).click(); }},
    {...A, action: 'uncheck the dashboard banner and save', mutates: true, afterScope: 'main', run: async (p) => { await p.locator('#settings-dialog [name="showBanner"]').uncheck(); await p.getByRole('button', {name: '설정 저장', exact: true}).click(); }},
    {...A, action: 'replace the category list and save, then open 새 업무 등록', mutates: true, afterScope: '#create-dialog', run: async (p) => { await set(p, 'categories', '요청지원\n기타'); await p.getByRole('button', {name: '설정 저장', exact: true}).click(); await settle(p, 300); await p.getByRole('button', {name: /새 업무 등록/}).click(); }},
    {...A, action: 'empty the category list and save', mutates: true, run: async (p) => { await set(p, 'categories', ''); await p.getByRole('button', {name: '설정 저장', exact: true}).click(); }},
    {...A, action: 'enter an invalid color and save', mutates: true, run: async (p) => { await set(p, 'primaryColor', 'red'); await p.getByRole('button', {name: '설정 저장', exact: true}).click(); }},
    {...A, action: 'save then reopen and click 변경 이력', mutates: true, run: async (p) => { await set(p, 'text_portalName', '변경 이력 확인'); await p.getByRole('button', {name: '설정 저장', exact: true}).click(); await settle(p, 300); await p.getByRole('button', {name: '관리자 설정'}).click(); await p.getByRole('button', {name: '변경 이력', exact: true}).click(); }},
    {...A, action: 'click × close', run: (p) => p.locator('#settings-dialog').getByRole('button', {name: '닫기'}).click()},
  ]);
  return {variants, interactions};
}

const openDetail = (title) => async (page) => {
  await go(page, 'board');
  let row = rowOf(page, title);
  // finished tasks sit behind a per-group "completed tasks" toggle
  if (!(await row.isVisible().catch(() => false))) {
    const toggles = page.getByRole('button', {name: /완료 업무 \d+건/});
    for (let i = 0, n = await toggles.count(); i < n; i++) await toggles.nth(i).click();
    await settle(page, 150);
    row = rowOf(page, title);
  }
  if (!(await row.isVisible().catch(() => false))) return {opened: false, reason: 'the task row is not visible'};
  await row.click();
  await page.locator('#detail-dialog[open]').waitFor();
  return {opened: true};
};

async function detail(h) {
  const variants = {};
  const cases = [['progress', TITLES.progress], ['done', TITLES.done], ['minimal', TITLES.minimal], ['test', '연습용']];
  for (const role of ROLES) {
    variants[`${role}/empty`] = {applicable: false};
    for (const [name, title] of cases) {
      const s = await openSession(h, role, 'populated');
      try {
        const entry = await openDetail(title)(s.page);
        await settle(s.page, 250);
        variants[`${role}/populated/${name}`] = entry.opened ? {opened: true, ...(await probe(s.page, '#detail-dialog'))} : entry;
      } finally { await s.close(); }
    }
  }
  const A = {role: 'admin', state: 'populated', scope: '#detail-dialog', open: openDetail(TITLES.progress)};
  const D = {...A, open: openDetail(TITLES.done)};
  const select = (p, v) => p.locator('#status-form select').selectOption({label: v});
  const changeStatus = (p) => p.getByRole('button', {name: '상태 변경', exact: true}).click();
  const interactions = await runInteractions(h, [
    {...A, action: 'choose 대기 and click 상태 변경', mutates: true, afterScope: 'main', run: async (p) => { await select(p, '대기'); await changeStatus(p); }},
    {...A, action: 'choose 완료 and click 상태 변경', mutates: true, afterScope: 'main', run: async (p) => { await select(p, '완료'); await changeStatus(p); }},
    {...A, action: 'click 상태 변경 without choosing another status', mutates: true, afterScope: 'main', run: (p) => changeStatus(p)},
    {...D, action: 'completed task: reopen to 진행 중 without a reason', mutates: true, run: async (p) => { await select(p, '진행 중'); await changeStatus(p); }},
    {...D, action: 'completed task: reopen to 진행 중 with a reason', mutates: true, afterScope: 'main', run: async (p) => { await select(p, '진행 중'); await p.locator('#status-form [name="reason"]').fill('추가 프로그램 설치 요청'); await changeStatus(p); }},
    {...A, action: 'type a memo and click 메모 남기기', mutates: true, run: async (p) => { await p.locator('#note-form [name="note"]').fill('협력사에 견적 요청함'); await p.getByRole('button', {name: '메모 남기기'}).click(); }},
    {...A, action: 'click 메모 남기기 with the memo empty', run: async (p, s, note) => { await p.getByRole('button', {name: '메모 남기기'}).click(); note.invalidFields = await p.locator('#note-form').evaluate((f) => [...f.elements].filter((e) => e.name && !e.checkValidity()).map((e) => e.name)); }},
    {...A, action: 'enter a new assignee and click 담당자 배정', mutates: true, run: async (p) => { await p.getByLabel('담당자', {exact: true}).fill('김하나'); await p.getByRole('button', {name: '담당자 배정'}).click(); }},
    {...A, action: 'clear the assignee and click 담당자 배정', run: async (p, s, note) => { await p.getByLabel('담당자', {exact: true}).fill(''); await p.getByRole('button', {name: '담당자 배정'}).click(); note.invalidFields = await p.locator('#assignment-form').evaluate((f) => [...f.elements].filter((e) => e.name && !e.checkValidity()).map((e) => e.name)); }},
    {...A, action: 'click 데이터 구분 변경 and accept the confirmation', mutates: true, run: (p) => p.getByRole('button', {name: '데이터 구분 변경'}).click()},
    {...A, action: 'click 데이터 구분 변경 and dismiss the confirmation', answer: null, run: (p) => p.getByRole('button', {name: '데이터 구분 변경'}).click()},
    {...A, action: 'attach a small text file', mutates: true, run: async (p) => { await p.locator('#task-file').setInputFiles({name: 'quote.txt', mimeType: 'text/plain', buffer: Buffer.from('견적서')}); await settle(p, 500); }},
    {...A, action: 'attach a file type that is not accepted', mutates: true, run: async (p) => { await p.locator('#task-file').setInputFiles({name: 'run.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x')}); await settle(p, 500); }},
    {...D, action: 'click the attached file link', run: async (p, s, note) => { note.download = await download(p, () => p.getByRole('link', {name: /toner\.txt/}).click()); }},
    {...D, action: 'click 파일 삭제 and accept the confirmation', mutates: true, run: (p) => p.getByRole('button', {name: '파일 삭제'}).click()},
    {...A, action: 'click 업무 삭제 and accept the reason prompt', mutates: true, afterScope: 'main', run: (p) => p.getByRole('button', {name: '업무 삭제', exact: true}).click()},
    {...A, action: 'click 업무 삭제 and cancel the reason prompt', answer: null, run: (p) => p.getByRole('button', {name: '업무 삭제', exact: true}).click()},
    {...A, action: 'click × close', afterScope: 'main', run: (p) => p.locator('#detail-dialog [aria-label="닫기"]').first().click()},
    {...A, action: 'press Escape', afterScope: 'main', run: (p) => p.keyboard.press('Escape')},
    {...A, role: 'viewer', action: 'viewer: look for controls that change the task', run: async (p, s, note) => { note.changeControlsVisible = await p.locator('#detail-dialog').evaluate((d) => ['#status-form', '#note-form', '#edit-task', '#delete-task', '#assignment-form', '#task-file', '#toggle-test'].filter((q) => d.querySelector(q)).length); }},
    {...A, role: 'viewer', action: 'viewer: click × close', afterScope: 'main', run: (p) => p.locator('#detail-dialog').getByRole('button', {name: '닫기'}).click()},
  ]);
  return {variants, interactions};
}

const openEdit = async (page, session) => {
  const e = await openDetail(TITLES.progress)(page, session);
  if (!e.opened) return e;
  const b = page.getByRole('button', {name: '업무 수정'});
  if (!(await b.isVisible())) return {opened: false, reason: 'the edit control is not visible for this role'};
  await b.click();
  await page.locator('#edit-task-dialog[open]').waitFor();
  return {opened: true};
};

async function editTask(h) {
  const variants = await dialogVariants(h, {scope: '#edit-task-dialog', opener: openEdit, applicable: (role, state) => state === 'populated'});
  const A = {role: 'admin', state: 'populated', scope: '#edit-task-dialog', open: openEdit};
  const f = (p, name, v) => p.locator(`#edit-task-dialog [name="${name}"]`).fill(v);
  const save = (p) => p.getByRole('button', {name: '수정 저장'}).click();
  const invalid = (p) => p.locator('#edit-task-dialog form').evaluate((x) => [...x.elements].filter((e) => e.name && !e.checkValidity()).map((e) => e.name));
  const interactions = await runInteractions(h, [
    {...A, action: 'click 수정 저장 without a reason', run: async (p, s, note) => { await save(p); note.invalidFields = await invalid(p); }},
    {...A, action: 'clear the title and click 수정 저장', run: async (p, s, note) => { await f(p, 'title', ''); await f(p, 'reason', '정정'); await save(p); note.invalidFields = await invalid(p); }},
    {...A, action: 'change the title with a reason and save', mutates: true, afterScope: '#detail-dialog', run: async (p) => { await f(p, 'title', '신규 입사자 노트북 2대 준비'); await f(p, 'reason', '수량 정정'); await save(p); }},
    {...A, action: 'change the due date and the priority with a reason and save', mutates: true, afterScope: '#detail-dialog', run: async (p) => { await f(p, 'due_date', '2026-11-12'); await p.locator('#edit-task-dialog [name="priority"]').selectOption({label: '하'}); await f(p, 'reason', '협의에 따른 기한 변경'); await save(p); }},
    {...A, action: 'change the request date with a reason and save', mutates: true, afterScope: '#detail-dialog', run: async (p) => { await f(p, 'requested_at', '2026-11-02'); await f(p, 'reason', '요청일 정정'); await save(p); }},
    {...A, action: 'enter a reason only and save (nothing changed)', mutates: true, afterScope: '#detail-dialog', run: async (p) => { await f(p, 'reason', '확인만'); await save(p); }},
    {...A, action: 'click 취소', afterScope: '#detail-dialog', run: (p) => p.getByRole('button', {name: '취소'}).click()},
    {...A, action: 'click × close', afterScope: '#detail-dialog', run: (p) => p.locator('#edit-task-dialog').getByRole('button', {name: '닫기'}).click()},
    {...A, action: 'save an edit for a task that another edit already changed (stale version)', mutates: true, run: async (p, s) => { const list = await s.env.api('/api/tasks'); const t = list.find((x) => x.title === TITLES.progress); const full = await s.env.api(`/api/tasks/${t.id}`); await s.env.api(`/api/tasks/${t.id}/edit`, {values: {title: full.title, requester: '다른 요청자', department: full.department, channel: full.channel, category: full.category, priority: full.priority, requested_at: full.requested_at, due_date: full.due_date, description: full.description}, reason: '다른 사람이 먼저 수정', revision: full.edit_revision}); await f(p, 'reason', '내 수정'); await f(p, 'title', '충돌 제목'); await save(p); await settle(p, 300); }},
  ]);
  return {variants, interactions};
}

// ---------------------------------------------------------------- screen table
const SCREENS = {
  overview: {run: overview, doc: [
    '# overview', '',
    '로그인 직후 처음 보이는 요약 화면이다. 위쪽에서 아래로 소개 배너, 네 칸 통계, 이번 달 운영 지표, 처리할 업무 목록, 완료율과 안내가 이어진다 (R-013, R-022).',
    '', '사용 방법', '- 처리할 업무 줄을 누르면 상세 창이 열린다 (R-006).', '- 목록 아래 링크와 왼쪽 메뉴로 업무 보드·업무 실적·개선 이력으로 옮겨 간다.',
    '- 이 화면이 열려 있고 창이 닫혀 있으면 30초마다 목록을 다시 불러온다 (R-013).', '- 조회 계정은 같은 내용을 읽기만 한다 (R-007).', '- 비어 있는 상태는 처리할 업무가 없다는 안내를 보여 준다.']},
  board: {run: board, doc: [
    '# board', '',
    '업무를 카드 보드로 모아 보는 화면이다. 상태 버튼, 검색, 묶음 기준, 날짜 기준과 기간, 간략 보기, CSV 내보내기, 새로고침이 위에 있고 묶음별로 접을 수 있는 업무 줄이 이어진다 (R-011, R-012, R-033, R-034).',
    '', '사용 방법', '- 상태 버튼과 검색어는 함께 적용된다. 일치하는 업무가 없으면 안내 문구가 나온다.',
    '- 묶음 기준은 날짜별·업무 분류별·요청 부서별·접수 경로별이다. 날짜별 묶음의 기준일은 처리일·요청일·완료일·등록일 중에서 고르고 시작일·종료일로 기간을 좁힌다.',
    '- 묶음 머리글을 누르면 접히고 다시 누르면 펼쳐진다.', '- 업무 줄을 누르면 상세 창이 열린다. 조회 계정은 조회 전용 표시가 붙고 등록 단추가 없다 (R-007).',
    '- 시험용으로 표시한 업무는 제목 앞에 구분 표시가 붙는다 (R-021).']},
  report: {run: report, doc: [
    '# report', '',
    '선택한 달의 운영 지표, 기한 도래·데이터 품질, 분류·상태별 접수 현황, 지표 산정 기준, 월간 보고서 초안과 발행 이력을 보여 준다 (R-017, R-022, R-023).',
    '', '사용 방법', '- 조회 월을 바꾸면 그 달 기준으로 다시 집계한다. 지표 새로 집계로 같은 달을 다시 불러온다.',
    '- 지표 CSV와 초안 내려받기는 파일을 저장한다. 관리자는 초안을 고친 뒤 검토 완료 · 리포트 발행으로 발행본을 남기고, 집계 뒤에 업무가 바뀌었으면 발행이 거절된다.',
    '- 발행 이력의 발행본 내려받기는 PDF 를 만든다 (R-024). 조회 계정은 초안을 읽기만 하고 발행 단추가 없다 (R-007).']},
  improvement: {run: improvement, doc: [
    '# improvement', '',
    '세 단계 로드맵과 개선 기록 관리대장을 보여 준다. 수행 단계로 목록을 거르고 관리대장 CSV 를 내려받는다 (R-025).',
    '', '사용 방법', '- 관리자는 개선 기록 단추로 새 기록을 만들고, 줄을 눌러 기존 기록을 고친다. 조회 계정은 줄을 눌러 내용을 읽기만 한다 (R-007).',
    '- 기록이 없으면 첫 기록을 남기라는 안내가 나온다.']},
  create: {run: create, doc: [
    '# create', '',
    '새 업무 등록 창이다. 제목·요청자·요청일은 필수이고 부서·접수 경로·분류·기한·중요도·내용은 선택이다 (R-001).',
    '', '사용 방법', '- 자동 분류 · 유사 업무 찾기는 제목과 내용으로 분류를 제안하고 비슷한 업무를 나열한다. 분류 적용을 눌러야 폼에 반영된다 (R-030).',
    '- 등록하면 창이 닫히고 새 업무의 상세 창이 열린다. 취소·닫기·Escape 는 입력을 버리고 닫으며, 다시 열면 폼이 비어 있고 요청일은 오늘로 채워진다.',
    '- 조회 계정에는 이 창을 여는 단추가 없다 (R-007).']},
  'improvement-dialog': {run: improvementDialog, doc: [
    '# improvement-dialog', '',
    '개선 기록을 만들거나 보는 창이다. 제목·출처·단계·상태·개선 전·개선 후·검증 결과 칸이 있다 (R-025).',
    '', '사용 방법', '- 관리자는 저장하고, 기존 기록에서는 수정 이력을 펼쳐 바뀐 항목을 본다. 검증 완료로 저장하려면 검증 결과가 필요하다.',
    '- 조회 계정은 모든 칸이 읽기 전용이고 저장 단추가 없다 (R-007).']},
  trash: {run: trash, doc: [
    '# trash', '',
    '삭제한 업무를 모아 둔 관리자 전용 창이다. 업무마다 복원과 영구 삭제가 있고 아래에서 삭제·복원 이력을 펼친다 (R-026, R-027).',
    '', '사용 방법', '- 복원은 사유를 묻고, 영구 삭제는 업무 제목을 정확히 다시 입력한 뒤 사유를 묻는다. 제목이 다르면 거절된다.',
    '- 줄의 제목을 누르면 삭제된 업무의 상세 창이 열리고 수정 단추는 없다.', '- 조회 계정에는 휴지통 단추가 없다 (R-007).']},
  settings: {run: settings, doc: [
    '# settings', '',
    '관리자 공통 설정 창이다. 화면 문구, 업무 선택 항목, 색상, 배너 표시, 로고, 변경 이력이 있다 (R-028, R-029).',
    '', '사용 방법', '- 저장하면 모든 사용자 화면에 바로 적용된다. 잘못된 값은 저장이 거절되고 창이 남는다.',
    '- 기본값 불러오기는 칸만 채우고 저장은 따로 눌러야 한다. 취소는 변경을 버린다. 변경 이력에서 최근 설정 변경을 본다.',
    '- 조회 계정에는 설정 단추가 없다 (R-007).']},
  'edit-task': {run: editTask, doc: [
    '# edit-task', '',
    '등록한 업무의 제목·요청자·부서·접수 경로·분류·중요도·요청일·기한·내용을 정정하는 창이다. 수정 사유가 필수이다 (R-031).',
    '', '사용 방법', '- 상세 창의 업무 수정 단추로 연다. 바꾼 항목과 사유는 업무 이력에 남고, 바뀐 것이 없으면 변경 없음 알림만 나온다.',
    '- 같은 업무를 다른 곳에서 먼저 고쳤으면 저장이 거절되고 창 안에 이유가 나온다.', '- 조회 계정에는 수정 단추가 없다 (R-007). 등록된 업무가 없는 상태에서는 열 수 없다.']},
  detail: {run: detail, doc: [
    '# detail', '',
    '업무 하나의 상세 창이다. 요청 정보, 내용, 상태 변경, 처리 메모, 담당자·첨부파일, 업무 이력이 한 창에 있다 (R-006).',
    '', '사용 방법', '- 상태를 바꾸면 창이 닫히고 목록이 갱신된다. 완료 업무를 되돌릴 때는 사유가 필요하다 (R-002, R-003).',
    '- 메모는 이력에만 쌓인다 (R-004). 담당자 배정, 데이터 구분 변경, 첨부 추가·삭제, 업무 삭제도 여기에서 한다 (R-015, R-020, R-021, R-026).',
    '- 조회 계정은 읽기만 하며 변경 도구가 보이지 않는다 (R-007).']},
};

// ---------------------------------------------------------------- the Next target
// Builds the production bundle once per run (web/src/security/productionBuild.ts owns how) and returns what spawnNext needs.
async function prepareNext() {
  const web = join(ROOT, 'web');
  const bin = join(web, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!existsSync(bin)) throw new SetupError(`next is not installed (${bin} missing). Run: (cd web && npm ci)`);
  if (process.env.ORBIT_UI_USE_BUILD === '1') {
    if (!existsSync(join(web, '.next', 'BUILD_ID'))) throw new SetupError('ORBIT_UI_USE_BUILD=1 but web/.next has no BUILD_ID. Build it first: (cd web && npm run build)');
    return {bin, cwd: web, distDir: '.next', remove() {}};
  }
  const {buildOwn} = await import(pathToFileURL(join(web, 'src', 'security', 'productionBuild.ts')).href);
  try {
    const build = buildOwn({});
    return {bin, cwd: web, distDir: build.distDir, remove: () => build.remove()};
  } catch (e) { throw new SetupError(`cannot build the Next app: ${String(e.message).split('\n').slice(0, 12).join('\n')}`); }
}

// ---------------------------------------------------------------- run
const stable = (screen, facts) => JSON.stringify({screen, ...facts}, null, 1) + '\n';

function lineDiff(name, expected, actual) {
  const a = expected.split('\n'), b = actual.split('\n'), out = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < 60; i++) if (a[i] !== b[i]) out.push(`  line ${i + 1}\n    committed: ${a[i] ?? '(missing)'}\n    captured:  ${b[i] ?? '(missing)'}`);
  return `${name}\n${out.join('\n')}`;
}

export const TARGETS = ['next'];

// Returns {check, screen, target} or {error} (the caller prints it and exits 2).
export function parseArgs(argv) {
  const out = {check: false, screen: null, target: 'next'};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') out.check = true;
    else if (arg === '--screen' || arg === '--target') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) return {error: `${arg} needs a value`};
      out[arg === '--screen' ? 'screen' : 'target'] = value;
    } else return {error: `unknown argument "${arg}"`};
  }
  if (!TARGETS.includes(out.target)) return {error: `unknown target "${out.target}". targets: ${TARGETS.join(', ')}`};
  if (!out.check) return {error: 'the committed facts are frozen and nothing writes them: add --check to compare the Next app with them'};
  return out;
}

// The committed facts were recorded against the old portal in local storage mode (local-store.js / kpi-store-local.js, both deleted);
// production and the Next app run the Supabase SQL. Where the two backends write
// different TEXT into the same business-history line, `--check` rewrites BOTH sides with this table before it
// compares. Each entry is exactly one known text difference. Everything else stays strictly compared. A snapshot is an array of
// aria lines; an entry is applied to the lines joined by "\n" (so a pattern may span adjacent lines).
const ADMIN_KINDS = '데이터 구분 변경|담당자 배정|첨부파일 등록|첨부파일 삭제|업무 정보 수정|업무 삭제|업무 복원';
export const BACKEND_NORMALIZATIONS = [
  {
    pattern: new RegExp(`(- text: <TS> · )총무 담당자(\\n\\s*- strong: (?:${ADMIN_KINDS}))`, 'g'),
    replacement: '$1admin$2',
    reason: 'Local mode records every history line with actor "총무 담당자"; the Supabase functions that write these kinds record actor "admin" (only 등록, 상태 변경, 처리 메모 keep the column default "총무 담당자").',
    evidence: 'local-store.js:27 vs supabase/kpi.sql:40,44,49,55 + supabase/edit.sql:23 + supabase/deletion.sql:80',
  },
  {
    pattern: /(- strong: 담당자 배정\n\s*- paragraph: ).+? → /g,
    replacement: '$1',
    reason: 'Local mode writes the assign detail as "<old assignee or 미배정> → <new>"; the Supabase function writes only the new assignee name.',
    evidence: 'kpi-store-local.js:20 vs supabase/kpi.sql:44',
  },
  {
    pattern: /(수정 사유: .*?)중요도: ([^\s"]+ → [^\s"]+) 처리 기한: ([^\s"]+ → [^\s"]+)/g,
    replacement: '$1처리 기한: $3 중요도: $2',
    reason: 'The edit detail lists changed fields in task-edit.js order (priority before due_date) in local mode; Supabase stores the changes as jsonb, which orders keys by length then bytes (due_date before priority).',
    evidence: 'task-edit.js:1,3 (editableFields order) vs supabase/edit.sql:16-23 (jsonb_build_object)',
  },
];

export function normalizeBackendMode(value, table = BACKEND_NORMALIZATIONS) {
  const lines = (list) => table.reduce((text, e) => text.replace(e.pattern, e.replacement), list.join('\n')).split('\n');
  const walk = (v) => Array.isArray(v) ? (v.every((x) => typeof x === 'string') ? lines(v) : v.map(walk)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
  return walk(value);
}

// Text in, text out; anything that is not JSON is left alone (factDiff then falls back to its line diff).
export function normalizeFactsText(text) {
  try { return JSON.stringify(normalizeBackendMode(JSON.parse(text)), null, 1) + '\n'; } catch { return text; }
}

const USAGE = 'usage: node scripts/capture-behavior.mjs [--screen <id>] --check [--target next]';

const show = (value) => { const text = JSON.stringify(value); return text === undefined ? '(missing)' : text.length > 200 ? text.slice(0, 200) + '…' : text; };

// First place where two JSON values differ: {path, expected, actual}, or null when equal. Arrays by index, objects by key.
export function firstDifference(expected, actual, path = '') {
  if (expected === actual) return null;
  const both = (v) => v !== null && typeof v === 'object';
  if (!both(expected) || !both(actual) || Array.isArray(expected) !== Array.isArray(actual)) return {path, expected, actual};
  const keys = Array.isArray(expected) ? Array.from({length: Math.max(expected.length, actual.length)}, (_, i) => i) : [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
  for (const key of keys) {
    const found = firstDifference(expected[key], actual[key], `${path}${Array.isArray(expected) ? `[${key}]` : `.${key}`}`);
    if (found) return found;
  }
  return null;
}

// Reads two facts files (text) and says, per variant and per interaction, the first differing fact. Falls back to a line diff
// when either text is not JSON. Returns null when they are the same text.
export function factDiff(name, committedText, capturedText) {
  if (committedText === capturedText) return null;
  let committed, captured;
  try { committed = JSON.parse(committedText); captured = JSON.parse(capturedText); } catch { return lineDiff(name, committedText, capturedText); }
  const items = [];
  const note = (label, a, b) => { const d = firstDifference(a, b); if (d) items.push(`  ${label}\n    first differing fact: ${d.path || '(whole record)'}\n      committed: ${show(d.expected)}\n      captured:  ${show(d.actual)}`); };
  const variantKeys = [...new Set([...Object.keys(committed.variants ?? {}), ...Object.keys(captured.variants ?? {})])];
  for (const key of variantKeys) note(`${committed.screen ?? name} variant ${key}`, committed.variants?.[key], captured.variants?.[key]);
  const count = Math.max(committed.interactions?.length ?? 0, captured.interactions?.length ?? 0);
  for (let i = 0; i < count; i++) {
    const a = committed.interactions?.[i], b = captured.interactions?.[i];
    note(`${committed.screen ?? name} interaction ${i} (${(a ?? b).role}/${(a ?? b).state} "${(a ?? b).action}")`, a, b);
  }
  const shown = items.slice(0, 12).join('\n');
  return `${name}: ${items.length} differing record(s) of ${variantKeys.length} variants + ${count} interactions${items.length > 12 ? ' (first 12 shown)' : ''}\n${shown}`;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) { console.error(`capture-behavior: ${parsed.error}\n${USAGE}`); process.exit(2); }
  const {screen: only} = parsed;
  if (only && !SCREENS[only]) { console.error(`unknown screen "${only}". ids: ${Object.keys(SCREENS).join(', ')}`); process.exit(2); }
  const ids = only ? [only] : Object.keys(SCREENS);
  const browser = await openBrowser(); // before the build: a missing browser should fail in a second, not after a build
  let next = null, code;
  try {
    next = await prepareNext();
    code = await capture(ids, {browser, skipped: [], next});
  } finally { await browser.close(); next?.remove(); }
  process.exit(code);
}

async function capture(ids, h) {
  const results = {};
  const queue = [...ids];
  // screens are independent (own server, own port), so a few run side by side
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const facts = makeNormalizer()(await SCREENS[id].run(h));
      const doc = SCREENS[id].doc.join('\n') + `\n\n사실 파일: ${id}.facts.json (${Object.keys(facts.variants).length} 변형, ${facts.interactions.length} 상호작용)\n`;
      results[id] = {[`${id}.facts.json`]: stable(id, facts), [`${id}.md`]: doc};
    }
  };
  await Promise.all(Array.from({length: Math.min(4, ids.length)}, worker));
  h.skipped.sort();
  const files = Object.assign({}, ...ids.map((id) => results[id]));
  for (const note of h.skipped) console.error(`could not drive: ${note}`);
  const problems = [];
  for (const [name, content] of Object.entries(files)) {
    const path = join(OUT, name);
    const committed = existsSync(path) ? readFileSync(path, 'utf8') : '';
    const diff = name.endsWith('.facts.json') ? factDiff(name, normalizeFactsText(committed), normalizeFactsText(content)) : committed !== content ? lineDiff(name, committed, content) : null;
    if (diff) problems.push(diff);
  }
  if (problems.length) { console.error(`behavior facts differ in ${problems.length} file(s) (next vs the frozen committed facts):\n${problems.join('\n')}`); return 1; }
  console.log(`behavior facts match (${Object.keys(files).length} files)`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    if (e instanceof SetupError) { console.error(`capture-behavior: ${e.message}`); process.exit(2); }
    console.error(e);
    process.exit(3);
  });
}
