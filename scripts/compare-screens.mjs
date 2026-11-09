#!/usr/bin/env node
// Screen-by-screen comparison of the legacy portal and the new Next.js portal.
//   eval "$(node scripts/env-for-tests.mjs)"          # browser environment (ORBIT_PLAYWRIGHT_PATH)
//   node scripts/compare-screens.mjs --screen <id> --start
//   node scripts/compare-screens.mjs --screen <id> --legacy-url U --next-url U
//   node scripts/compare-screens.mjs --screen <id> --self-test [--second-root <dir>]
// Options: --threshold-pixel R (default 0.005), --start launches both apps (legacy: node server.js,
// next: `npx next start` in web/, needs web/.next), --self-test runs the legacy app against itself
// (--second-root runs the second instance from another checkout, used to prove the tool notices a change).
// Screen ids: overview board report improvement create improvement-dialog trash settings edit-task detail.
// Per screen it shoots 2 roles (admin, viewer) x 2 states (empty, populated) x 2 viewports (desktop 1440x1050,
// mobile 390x844) = 8 shots per side into scratch/compare/<screen>/ and writes report.json and side-by-side.html.
// A shot a screen cannot reach on either side is recorded as `skipped` with the reason; a shot reachable on one
// side only is a failure. Server clocks are frozen by a preload when the tool starts the apps; with explicit URLs
// the targets keep their own clock, so timestamps can differ.
// Exit codes: 0 every compared shot has equal DOM facts and pixelRatio <= threshold, 1 a shot differs
// (or nothing could be compared), 2 setup problem (usage, browser env, Next not built, server did not start).
// Clean room: this tool only drives the running apps through a browser; it reads no frontend/ or public/board/ source.
import {spawn} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {createServer} from 'node:net';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN = {user: 'admin', password: 'compare-admin'};
const VIEWER = {user: 'viewer', password: 'compare-viewer'};
const FIXED_TIME = '2026-11-04T01:00:00Z'; // 10:00 KST, inside the month of the fixtures
const VIEWPORTS = {desktop: {width: 1440, height: 1050}, mobile: {width: 390, height: 844}};
const ROLES = {admin: ADMIN, viewer: VIEWER};
const PIXEL_LIMIT = 24;
const FIRST_TASK = '신규 입사자 노트북 준비';
const FIRST_IMPROVEMENT = '월간 보고서 양식 개선';

class SetupError extends Error {}
class Unreachable extends Error {}

// ---------------------------------------------------------------- pure functions

// Compares two RGBA buffers of w*h pixels. A pixel differs when any channel (alpha included) differs by more
// than `limit`. Self-contained on purpose: the browser evaluates this function's source on a canvas.
export function diffPixels(a, b, w, h, limit = 24) {
  const size = w * h * 4;
  if (a.length !== size || b.length !== size) throw new Error(`pixel buffer length ${a.length}/${b.length} does not match ${w}x${h}`);
  const diff = new Uint8ClampedArray(size);
  let count = 0;
  for (let i = 0; i < size; i += 4) {
    let differs = false;
    for (let c = 0; c < 4; c++) if (Math.abs(a[i + c] - b[i + c]) > limit) differs = true;
    if (differs) {
      count++;
      diff[i] = 255; diff[i + 1] = 0; diff[i + 2] = 0; diff[i + 3] = 255;
    } else {
      for (let c = 0; c < 3; c++) diff[i + c] = Math.round(255 - (255 - a[i + c]) * 0.25);
      diff[i + 3] = 255;
    }
  }
  return {count, ratio: w * h === 0 ? 0 : count / (w * h), diff};
}

// Accessibility-tree lines without runtime noise (element refs, cursor and focus hints).
export function normalizeAria(text) {
  return String(text).split('\n')
    .map((line) => line.replace(/\s\[ref=[^\]]*\]/g, '').replace(/\s\[cursor=[^\]]*\]/g, '').replace(/\s\[active\]/g, '').replace(/\s+$/, ''))
    .filter((line) => line.trim() !== '');
}

// Line diff (LCS) of two normalized snapshots: "- " lines exist only in `a`, "+ " lines only in `b`.
export function compareDomFacts(a, b, maxLines = 60) {
  const x = normalizeAria(a), y = normalizeAria(b);
  if (x.length === y.length && x.every((line, i) => line === y[i])) return {equal: true, diff: []};
  const out = [];
  if (x.length * y.length > 4_000_000) {
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) {
      if (x[i] !== undefined) out.push('- ' + x[i].trim());
      if (y[i] !== undefined) out.push('+ ' + y[i].trim());
    }
  } else {
    const table = Array.from({length: x.length + 1}, () => new Uint32Array(y.length + 1));
    for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) {
      table[i][j] = x[i] === y[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
    let i = 0, j = 0;
    while (i < x.length || j < y.length) {
      if (i < x.length && j < y.length && x[i] === y[j]) { i++; j++; }
      else if (j >= y.length || (i < x.length && table[i + 1][j] >= table[i][j + 1])) out.push('- ' + x[i++].trim());
      else out.push('+ ' + y[j++].trim());
    }
  }
  const shown = out.slice(0, maxLines);
  if (out.length > maxLines) shown.push(`... ${out.length - maxLines} more differing lines`);
  return {equal: false, diff: shown};
}

// ---------------------------------------------------------------- screens

const quietAfter = async (page) => { await quiet(page); await page.evaluate(() => document.fonts.ready.then(() => true)); await page.waitForTimeout(300); };
const visible = async (locator, what) => {
  try { await locator.waitFor({state: 'visible', timeout: 4000}); } catch { throw new Unreachable(`${what} is not visible`); }
  return locator;
};
const navItem = (page, name) => {
  const nav = page.getByRole('navigation');
  return nav.getByRole('button', {name}).or(nav.getByRole('link', {name})).first();
};
const goTo = async (page, name) => { await (await visible(navItem(page, name), `navigation item ${name}`)).click(); await quietAfter(page); };
const clickNamed = async (page, name, what) => { await (await visible(page.getByRole('button', {name}).first(), what)).click(); await quietAfter(page); };
const dialogShown = async (page, what) => { await visible(page.getByRole('dialog').last(), `${what} dialog`); await quietAfter(page); };
const openDetail = async (page, {state}) => {
  if (state === 'empty') throw new Unreachable('no task exists in the empty state');
  await clickNamed(page, new RegExp(FIRST_TASK), `task row ${FIRST_TASK}`);
  await dialogShown(page, 'detail');
};

export const SCREENS = {
  overview: {reach: async () => {}},
  board: {reach: async (page) => goTo(page, /업무 보드/)},
  report: {reach: async (page) => goTo(page, /업무 실적/)},
  improvement: {reach: async (page) => goTo(page, /개선 이력/)},
  create: {dialog: true, reach: async (page) => { await clickNamed(page, /새 업무 등록/, 'new task button'); await dialogShown(page, 'create'); }},
  'improvement-dialog': {dialog: true, reach: async (page, ctx) => {
    await goTo(page, /개선 이력/);
    if (ctx.state === 'populated') await clickNamed(page, new RegExp(FIRST_IMPROVEMENT), `improvement record ${FIRST_IMPROVEMENT}`);
    else await clickNamed(page, /＋\s*개선 기록/, 'new improvement button');
    await dialogShown(page, 'improvement');
  }},
  trash: {dialog: true, reach: async (page) => { await clickNamed(page, /관리자 휴지통/, 'trash button'); await dialogShown(page, 'trash'); }},
  settings: {dialog: true, reach: async (page) => { await clickNamed(page, /관리자 설정/, 'settings button'); await dialogShown(page, 'settings'); }},
  'edit-task': {dialog: true, reach: async (page, ctx) => {
    await openDetail(page, ctx);
    await clickNamed(page, /^업무 수정$/, 'edit task button');
    await dialogShown(page, 'edit task');
  }},
  detail: {dialog: true, reach: openDetail},
};

// ---------------------------------------------------------------- arguments

export function parseArgs(argv) {
  const o = {screen: null, start: false, legacyUrl: null, nextUrl: null, selfTest: false, threshold: 0.005, secondRoot: null};
  const value = (i, flag) => { if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--screen') o.screen = value(i++, arg);
    else if (arg === '--start') o.start = true;
    else if (arg === '--self-test') o.selfTest = true;
    else if (arg === '--legacy-url') o.legacyUrl = value(i++, arg);
    else if (arg === '--next-url') o.nextUrl = value(i++, arg);
    else if (arg === '--second-root') o.secondRoot = resolve(value(i++, arg));
    else if (arg === '--threshold-pixel') {
      const text = value(i++, arg), n = Number(text);
      if (text.trim() === '' || !Number.isFinite(n) || n < 0 || n > 1) throw new Error(`--threshold-pixel needs a number from 0 to 1, got "${text}"`);
      o.threshold = n;
    } else throw new Error(`unknown option ${arg}`);
  }
  if (!o.screen) throw new Error('--screen <id> is required');
  if (!SCREENS[o.screen]) throw new Error(`unknown screen "${o.screen}" (known: ${Object.keys(SCREENS).join(', ')})`);
  if (o.secondRoot && !o.selfTest) throw new Error('--second-root only works with --self-test');
  if (!o.start && !o.selfTest) {
    if (!o.legacyUrl && !o.nextUrl) throw new Error('pick one: --start, --self-test, or --legacy-url with --next-url');
    if (!o.legacyUrl) throw new Error('--legacy-url is required together with --next-url');
    if (!o.nextUrl) throw new Error('--next-url is required together with --legacy-url');
  }
  if (o.start && (o.legacyUrl || o.nextUrl)) throw new Error('--start already launches both apps; drop --legacy-url/--next-url');
  return o;
}

// ---------------------------------------------------------------- servers

const children = [];
const stopAll = async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null) {
      const done = new Promise((r) => child.once('exit', r));
      child.kill();
      await Promise.race([done, new Promise((r) => setTimeout(r, 3000))]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  }
};

async function freePort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const {port} = server.address();
  await new Promise((r) => server.close(r));
  return port;
}

function writeFreezePreload(runDir) {
  const file = join(runDir, 'freeze-time.mjs');
  writeFileSync(file, `const FIXED=Date.parse(${JSON.stringify(FIXED_TIME)}),Real=Date;
class FrozenDate extends Real{constructor(...a){if(a.length===0)super(FIXED);else super(...a);}static now(){return FIXED;}}
globalThis.Date=FrozenDate;
`);
  return file;
}

async function waitHttp(base, child, label, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new SetupError(`${label} exited with code ${child.exitCode} before it answered\n${child.log}`);
    try { await fetch(base + '/', {signal: AbortSignal.timeout(2000)}); return; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new SetupError(`${label} did not answer on ${base} within ${ms / 1000}s\n${child.log}`);
}

async function launch(label, command, args, cwd, env, ms) {
  const port = await freePort();
  const child = spawn(command, args, {cwd, env: {...env, PORT: String(port), HOST: '127.0.0.1', HOSTNAME: '127.0.0.1'}, stdio: ['ignore', 'pipe', 'pipe']});
  child.log = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { child.log = (child.log + chunk).slice(-4000); });
  children.push(child);
  const base = `http://127.0.0.1:${port}`;
  await waitHttp(base, child, label, ms);
  return base;
}

function serverEnv(freeze, dataDir) {
  const env = {...process.env, ADMIN_PASSWORD: ADMIN.password, VIEWER_PASSWORD: VIEWER.password, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import ${pathToFileURL(freeze).href}`.trim()};
  for (const key of ['STORAGE_BACKEND', 'NODE_ENV', 'SUPABASE_URL']) delete env[key];
  if (dataDir) env.DATA_DIR = dataDir;
  return env;
}

// ---------------------------------------------------------------- seeding

const basic = ({user, password}) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');

// The request sequence of test/golden.test.js plus a completed task, a trashed task and an improvement record.
async function seed(base) {
  const call = async (method, path, body) => {
    const response = await fetch(base + path, {method, headers: {Authorization: basic(ADMIN), ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    const text = await response.text();
    if (!response.ok) throw new SetupError(`seeding ${base}: ${method} ${path} answered ${response.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };
  const one = await call('POST', '/api/tasks', {title: FIRST_TASK, requester: '홍길동', department: '인사팀', channel: '메신저', category: '비품·자산', priority: '높음', requested_at: '2026-11-03T01:00:00Z', due_date: '2026-11-05', description: '노트북 1대 준비'});
  const two = await call('POST', '/api/tasks', {title: '  최소 입력  ', requester: ' 김철수 ', requested_at: '2026-11-03T02:00:00Z'});
  await call('POST', `/api/tasks/${one.id}/status`, {status: '진행 중'});
  await call('POST', `/api/tasks/${one.id}/notes`, {note: '장비 준비 및 계정 설정 완료'});
  await call('POST', `/api/tasks/${one.id}/status`, {status: '대기', reason: '부품 대기'});
  await call('POST', `/api/tasks/${one.id}/status`, {status: '완료'});
  await call('POST', `/api/tasks/${one.id}/status`, {status: '진행 중', reason: '추가 프로그램 설치 요청'});
  await call('POST', `/api/tasks/${two.id}/notes`, {note: '같은 출처 메모'});
  const three = await call('POST', '/api/tasks', {title: '정기 비품 재고 점검', requester: '이영희', department: '총무팀', category: '고정업무', priority: '낮음', requested_at: '2026-11-02T01:00:00Z', due_date: '2026-11-04'});
  await call('POST', `/api/tasks/${three.id}/status`, {status: '진행 중'});
  await call('POST', `/api/tasks/${three.id}/status`, {status: '완료'});
  const four = await call('POST', '/api/tasks', {title: '휴지통 확인용 업무', requester: '박민수', requested_at: '2026-11-03T03:00:00Z'});
  await call('POST', `/api/tasks/${four.id}/delete`, {reason: '테스트 업무 정리'});
  await call('POST', '/api/improvements', {value: {title: FIRST_IMPROVEMENT, stage: '본인 실사용', source: '본인', feedback: '보고서 양식이 매월 달라진다', action: '양식을 고정했다', result: '', status: '개선 중'}});
}

// ---------------------------------------------------------------- browser

const trackers = new WeakMap();
function track(page) {
  const t = {inflight: 0, last: Date.now()};
  const bump = () => { t.last = Date.now(); };
  page.on('request', () => { t.inflight++; bump(); });
  for (const event of ['requestfinished', 'requestfailed']) page.on(event, () => { t.inflight = Math.max(0, t.inflight - 1); bump(); });
  trackers.set(page, t);
}
async function quiet(page) {
  const t = trackers.get(page), deadline = Date.now() + 15000;
  while (t.inflight > 0 || Date.now() - t.last < 400) {
    if (Date.now() > deadline) throw new SetupError('page never became network-quiet within 15s');
    await page.waitForTimeout(100);
  }
}

async function shoot(browser, base, roleName, viewportName, state, screen) {
  const context = await browser.newContext({
    httpCredentials: {username: ROLES[roleName].user, password: ROLES[roleName].password},
    viewport: VIEWPORTS[viewportName], deviceScaleFactor: 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce',
  });
  try {
    await context.clock.setFixedTime(new Date(FIXED_TIME));
    const page = await context.newPage();
    track(page);
    const response = await page.goto(base + '/', {waitUntil: 'load'});
    if (response && response.status() === 401) throw new SetupError(`${base} rejected the ${roleName} test credentials (401)`);
    await quietAfter(page);
    try {
      await SCREENS[screen].reach(page, {role: roleName, state, viewport: viewportName});
    } catch (error) {
      if (error instanceof Unreachable) return {unreachable: error.message};
      throw error;
    }
    const png = await page.screenshot({fullPage: !SCREENS[screen].dialog, animations: 'disabled', caret: 'hide'});
    const aria = `# title: ${await page.title()}\n${await page.locator('body').ariaSnapshot()}`;
    return {png, aria};
  } finally {
    await context.close();
  }
}

async function browserDiff(page, a, b) {
  return page.evaluate(async ({src, a, b, limit}) => {
    const compare = (0, eval)('(' + src + ')');
    const load = async (data) => { const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode(); return img; };
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const W = Math.max(ia.naturalWidth, ib.naturalWidth), H = Math.max(ia.naturalHeight, ib.naturalHeight);
    const read = (img) => {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, W, H).data;
    };
    const result = compare(read(ia), read(ib), W, H, limit);
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    out.getContext('2d').putImageData(new ImageData(result.diff, W, H), 0, 0);
    return {count: result.count, ratio: result.ratio, size: [W, H], legacySize: [ia.naturalWidth, ia.naturalHeight], nextSize: [ib.naturalWidth, ib.naturalHeight], png: out.toDataURL('image/png').split(',')[1]};
  }, {src: diffPixels.toString(), a: a.toString('base64'), b: b.toString('base64'), limit: PIXEL_LIMIT});
}

// ---------------------------------------------------------------- report

const escapeHtml = (v) => String(v).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

function sideBySideHtml(report, targets) {
  const cards = report.shots.map((shot) => {
    const status = shot.skipped ? `skipped: ${shot.reason}` : `pixel ${(shot.pixelRatio ?? NaN) * 100}% · DOM ${shot.domEqual ? 'equal' : 'DIFFERENT'}`;
    const figure = (label, file) => `<figure><figcaption>${label}</figcaption>${file ? `<img src="${escapeHtml(file)}" alt="${escapeHtml(label + ' ' + shot.name)}">` : '<p>no image</p>'}</figure>`;
    const dom = shot.domDiff?.length ? `<pre>${escapeHtml(shot.domDiff.join('\n'))}</pre>` : '';
    return `<section class="${shot.skipped ? 'skip' : shot.domEqual && shot.pixelRatio <= report.threshold ? 'ok' : 'bad'}"><h2>${escapeHtml(shot.name)} — ${escapeHtml(status)}</h2><div class="row">${figure('legacy', shot.files?.legacy)}${figure('next', shot.files?.next)}${figure('diff', shot.files?.diff)}</div>${dom}</section>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>compare ${escapeHtml(report.screen)}</title><style>
body{font:14px system-ui,sans-serif;margin:16px;background:#f4f4f6}h1{font-size:20px}h2{font-size:15px;margin:0 0 8px}
section{background:#fff;border-left:6px solid #888;margin:0 0 16px;padding:10px 12px}section.ok{border-color:#2a9d4a}section.bad{border-color:#d62839}section.skip{border-color:#c9a227}
.row{display:flex;gap:8px;align-items:flex-start;overflow-x:auto}figure{margin:0;flex:1 1 0;min-width:240px}figcaption{font-weight:600;margin-bottom:4px}img{max-width:100%;border:1px solid #ccc}
pre{background:#fafafa;border:1px solid #ddd;padding:8px;overflow:auto;max-height:300px}</style></head><body>
<h1>${escapeHtml(report.screen)} — ${report.pass ? 'PASS' : 'FAIL'}</h1><p>legacy: ${escapeHtml(targets.legacy)} · next: ${escapeHtml(targets.next)} · pixel threshold ${report.threshold}</p>
${cards}
</body></html>
`;
}

// ---------------------------------------------------------------- main

async function run(options) {
  if (!process.env.ORBIT_PLAYWRIGHT_PATH) throw new SetupError('ORBIT_PLAYWRIGHT_PATH is unset. Run: eval "$(node scripts/env-for-tests.mjs)"');
  const {chromium} = await import(pathToFileURL(process.env.ORBIT_PLAYWRIGHT_PATH).href);
  if (options.start && !existsSync(join(ROOT, 'web/.next'))) {
    throw new SetupError('the Next app is not built (web/.next is missing). Build it first: (cd web && npm ci && npm run build)');
  }
  const outDir = join(ROOT, 'scratch/compare', options.screen);
  const runRoot = join(ROOT, 'scratch/compare/run');
  rmSync(outDir, {recursive: true, force: true});
  mkdirSync(outDir, {recursive: true});
  mkdirSync(runRoot, {recursive: true});
  const runDir = mkdtempSync(join(runRoot, `${options.screen}-`));
  let legacyBase = options.legacyUrl, nextBase = options.nextUrl;
  try {
    if (options.selfTest || options.start) {
      const freeze = writeFreezePreload(runDir);
      const legacyEnv = serverEnv(freeze, join(runDir, 'legacy-data'));
      mkdirSync(join(runDir, 'legacy-data'));
      legacyBase = await launch('legacy portal', process.execPath, ['server.js'], ROOT, legacyEnv, 30000);
      if (options.selfTest) {
        const secondRoot = options.secondRoot ?? ROOT;
        mkdirSync(join(runDir, 'second-data'));
        nextBase = await launch(`second legacy instance (${secondRoot})`, process.execPath, ['server.js'], secondRoot, serverEnv(freeze, join(runDir, 'second-data')), 30000);
      } else {
        nextBase = await launch('next app', 'npx', ['next', 'start', '-p', String(await freePort())], join(ROOT, 'web'), serverEnv(freeze, null), 90000);
      }
    }
    const browser = await chromium.launch({headless: true});
    try {
      const diffContext = await browser.newContext();
      const diffPage = await diffContext.newPage();
      await diffPage.goto('about:blank');
      const shots = [];
      for (const state of ['empty', 'populated']) {
        if (state === 'populated') { await seed(legacyBase); await seed(nextBase); }
        for (const role of Object.keys(ROLES)) for (const viewport of Object.keys(VIEWPORTS)) {
          const name = `${role}-${state}-${viewport}`;
          const [legacy, next] = [await shoot(browser, legacyBase, role, viewport, state, options.screen), await shoot(browser, nextBase, role, viewport, state, options.screen)];
          const files = {};
          for (const [side, result] of [['legacy', legacy], ['next', next]]) if (result.png) {
            files[side] = `${side}-${name}.png`;
            writeFileSync(join(outDir, files[side]), result.png);
          }
          if (legacy.unreachable && next.unreachable) {
            shots.push({name, skipped: true, reason: legacy.unreachable === next.unreachable ? legacy.unreachable : `legacy: ${legacy.unreachable}; next: ${next.unreachable}`, pixelRatio: null, domEqual: null, domDiff: []});
          } else if (legacy.unreachable || next.unreachable) {
            const only = legacy.unreachable ? 'next' : 'legacy', missing = legacy.unreachable ? 'legacy' : 'next';
            shots.push({name, pixelRatio: null, domEqual: false, domDiff: [`reachable on ${only} only; ${missing}: ${legacy.unreachable ?? next.unreachable}`], files});
          } else {
            const pixels = await browserDiff(diffPage, legacy.png, next.png);
            files.diff = `diff-${name}.png`;
            writeFileSync(join(outDir, files.diff), Buffer.from(pixels.png, 'base64'));
            const dom = compareDomFacts(legacy.aria, next.aria);
            const shot = {name, pixelRatio: pixels.ratio, domEqual: dom.equal, domDiff: dom.diff, files};
            if (pixels.legacySize.join() !== pixels.nextSize.join()) shot.sizes = {legacy: pixels.legacySize, next: pixels.nextSize};
            shots.push(shot);
          }
        }
      }
      const compared = shots.filter((s) => !s.skipped);
      const pass = compared.length > 0 && compared.every((s) => s.domEqual && s.pixelRatio !== null && s.pixelRatio <= options.threshold);
      const report = {screen: options.screen, threshold: options.threshold, pass, compared: compared.length, skipped: shots.length - compared.length, shots};
      writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
      writeFileSync(join(outDir, 'side-by-side.html'), sideBySideHtml(report, {legacy: legacyBase, next: nextBase}));
      return report;
    } finally {
      await browser.close();
    }
  } finally {
    await stopAll();
    rmSync(runDir, {recursive: true, force: true});
  }
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); } catch (error) { console.error(`compare-screens: ${error.message}`); return 2; }
  try {
    const report = await run(options);
    for (const s of report.shots) {
      console.log(s.skipped ? `SKIP  ${s.name}  ${s.reason}` : `${s.domEqual && s.pixelRatio <= options.threshold ? 'ok   ' : 'FAIL '} ${s.name}  pixel ${s.pixelRatio}  dom ${s.domEqual ? 'equal' : 'DIFFERENT'}${s.domDiff.length && !s.domEqual ? '  ' + s.domDiff[0] : ''}`);
    }
    console.log(`${report.pass ? 'PASS' : 'FAIL'} ${report.screen}: ${report.compared} compared, ${report.skipped} skipped. Open scratch/compare/${report.screen}/side-by-side.html`);
    return report.pass ? 0 : 1;
  } catch (error) {
    console.error(`compare-screens: ${error instanceof SetupError ? '' : 'unexpected error: '}${error.stack && !(error instanceof SetupError) ? error.stack : error.message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.on('SIGINT', () => { stopAll().finally(() => process.exit(130)); });
  process.exitCode = await main();
}
