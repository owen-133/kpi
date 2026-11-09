// Tests for scripts/verify.mjs and scripts/impact.mjs orchestration.
// Run: node --test scripts/verify.test.mjs
//
// Layers are faked (injected into main()), so no real suite runs and nothing here
// calls `node --test` again. The only real layer commands used are agents-size
// (a file size) and product-untouched (git diff) inside throw-away temp repos.
// untested: the real root-tests / web-* / generated / graft layer commands (they
// run the whole suites; see the Done-when run of `node scripts/verify.mjs`), and
// impact's graft blast branch (needs the pinned graft installed).
import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAYERS, main as verifyMain, parseArgs} from './verify.mjs';
import {main as impactMain, parseRequirements} from './impact.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'verify-test-')));
after(() => rmSync(sandbox, {recursive: true, force: true}));

let counter = 0;
const tmp = () => {
  const dir = join(sandbox, `case-${counter++}`);
  mkdirSync(dir, {recursive: true});
  return dir;
};
const capture = () => {
  const buf = {out: '', err: ''};
  return {buf, io: {out: (s) => (buf.out += s), err: (s) => (buf.err += s)}};
};
const runVerify = (argv, layers) => {
  const {buf, io} = capture();
  const code = verifyMain(argv, {layers, ...io});
  return {code, ...buf};
};
const pass = (id, ran) => ({id, run: () => (ran?.push(id), {ok: true, note: `${id} fine`, output: `output of ${id}\n`})});
const fail = (id, ran) => ({id, run: () => (ran?.push(id), {ok: false, note: 'exit 1', output: `${'noise\n'.repeat(30)}boom from ${id}\n`})});

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], {cwd, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

test('a failing layer does not stop later layers; exit 1 and the failed layer are reported', () => {
  const ran = [];
  const r = runVerify([], [pass('a', ran), fail('b', ran), pass('c', ran), fail('d', ran)]);
  assert.deepEqual(ran, ['a', 'b', 'c', 'd']);
  assert.equal(r.code, 1);
  assert.match(r.out, /VERIFY: FAIL \(b, d\)\n$/);
  assert.match(r.out, /^layer\s+\| result\s+\| seconds\s+\| note/);
  assert.match(r.out, /^a\s+\| PASS/m);
  assert.match(r.out, /^b\s+\| FAIL/m);
});

test('only failed layers print their output tail, limited to 15 lines', () => {
  const r = runVerify([], [pass('a'), fail('b')]);
  assert.match(r.out, /boom from b/);
  assert.doesNotMatch(r.out, /output of a/);
  assert.equal(r.out.split('\n').filter((l) => l === 'noise').length, 14);
});

test('every layer passing gives exit 0 and VERIFY: PASS', () => {
  const r = runVerify([], [pass('a'), pass('b')]);
  assert.equal(r.code, 0);
  assert.match(r.out, /VERIFY: PASS\n$/);
  assert.doesNotMatch(r.out, /FAIL/);
});

test('a layer that throws is a failed layer and later layers still run', () => {
  const ran = [];
  const r = runVerify([], [{id: 'x', run: () => { throw new Error('kaput'); }}, pass('y', ran)]);
  assert.deepEqual(ran, ['y']);
  assert.equal(r.code, 1);
  assert.match(r.out, /VERIFY: FAIL \(x\)/);
  assert.match(r.out, /threw: kaput/);
});

test('--only and --skip select layers (a skipped failing layer cannot fail the run)', () => {
  const ran = [];
  const layers = () => [pass('a', ran), fail('b', ran), pass('c', ran)];
  assert.equal(runVerify(['--only', 'a,c'], layers()).code, 0);
  assert.deepEqual(ran.splice(0), ['a', 'c']);
  assert.equal(runVerify(['--skip', 'b'], layers()).code, 0);
  assert.deepEqual(ran.splice(0), ['a', 'c']);
  assert.equal(runVerify(['--only', 'a,b', '--skip', 'a'], layers()).code, 1);
  assert.deepEqual(ran.splice(0), ['b']);
});

test('usage errors exit 2 and run nothing', () => {
  const cases = [['--bogus'], ['--only'], ['--only', 'nope'], ['--skip', 'a,nope'], ['--root', join(sandbox, 'missing-dir')], ['--only', 'a', '--skip', 'a']];
  for (const argv of cases) {
    const ran = [];
    const r = runVerify(argv, [pass('a', ran)]);
    assert.equal(r.code, 2, argv.join(' '));
    assert.match(r.err, /usage: node scripts\/verify\.mjs/);
    assert.deepEqual(ran, []);
  }
  assert.throws(() => parseArgs(['--base']), /needs a value/);
});

test('the real CLI exits 2 on a usage error and lists the known layers', () => {
  const r = spawnSync('node', [join(here, 'verify.mjs'), '--only', 'nope'], {encoding: 'utf8'});
  assert.equal(r.status, 2);
  for (const layer of LAYERS) assert.ok(r.stderr.includes(layer.id), layer.id);
});

test('the layer table names the required layers in order', () => {
  assert.deepEqual(LAYERS.map((l) => l.id), ['root-tests', 'web-tests', 'web-types', 'web-build', 'generated', 'graft', 'audit', 'agents-size', 'product-untouched']);
});

// The audit layer runs `npm --prefix web audit ...`; a fake `npm` first on PATH stands for the registry's answer.
function runAuditWith({status, text}) {
  const bin = tmp();
  const argsFile = join(bin, 'args.txt');
  writeFileSync(join(bin, 'npm'), `#!/bin/sh\necho "$@" > '${argsFile}'\nprintf '%s\\n' '${text}' >&2\nexit ${status}\n`);
  chmodSync(join(bin, 'npm'), 0o755);
  const saved = process.env.PATH;
  process.env.PATH = `${bin}:${saved}`;
  try {
    const layer = LAYERS.find((l) => l.id === 'audit');
    return {...runLayerOutcome(layer, tmp()), args: readFileSync(argsFile, 'utf8').trim()};
  } finally {
    process.env.PATH = saved;
  }
}
const runLayerOutcome = (layer, root) => {
  const r = layer.run({root});
  return {state: r.state ?? (r.ok ? 'PASS' : 'FAIL'), note: r.note ?? '', output: r.output ?? ''};
};

test('audit: asks npm for high-severity production advisories and passes when it finds none', () => {
  const r = runAuditWith({status: 0, text: 'found 0 vulnerabilities'});
  assert.equal(r.args, '--prefix web audit --omit=dev --audit-level=high');
  assert.equal(r.state, 'PASS');
  assert.doesNotMatch(r.note, /env-skipped/);
});

test('audit: a reported vulnerability fails the layer', () => {
  const r = runAuditWith({status: 1, text: 'next  <16.4.6\nSeverity: high\n1 high severity vulnerability'});
  assert.equal(r.state, 'FAIL');
  assert.match(r.output, /high severity vulnerability/);
});

test('audit: an unreachable registry is env-skipped with the reason, for ENOTFOUND, ETIMEDOUT and EAI_AGAIN', () => {
  for (const code of ['ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']) {
    const r = runAuditWith({status: 1, text: `npm warn audit request to https://registry.npmjs.org/-/npm/v1/security/advisories/bulk failed, reason: getaddrinfo ${code} registry.npmjs.org\nundefined\nnpm error audit endpoint returned an error`});
    assert.equal(r.state, 'PASS', code);
    assert.match(r.note, new RegExp(`^env-skipped: .*${code}`), code);
  }
});

test('audit: a failure that is neither a finding nor a network error still fails', () => {
  const r = runAuditWith({status: 1, text: 'npm error code EJSONPARSE'});
  assert.equal(r.state, 'FAIL');
});

test('agents-size: below the limit passes, padded over 32768 bytes fails and the table shows it', () => {
  const root = tmp();
  const cli = (...extra) => spawnSync('node', [join(here, 'verify.mjs'), '--only', 'agents-size', '--root', root, ...extra], {encoding: 'utf8'});
  writeFileSync(join(root, 'AGENTS.md'), 'x'.repeat(32767));
  const ok = cli();
  assert.equal(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, /^agents-size\s+\| PASS\s+\|.*32767 bytes/m);
  writeFileSync(join(root, 'AGENTS.md'), 'x'.repeat(32768));
  const bad = cli();
  assert.equal(bad.status, 1, bad.stdout);
  assert.match(bad.stdout, /^agents-size\s+\| FAIL\s+\|.*32768 bytes/m);
  assert.match(bad.stdout, /VERIFY: FAIL \(agents-size\)/);
});

test('agents-size: a missing AGENTS.md fails instead of passing', () => {
  const r = spawnSync('node', [join(here, 'verify.mjs'), '--only', 'agents-size', '--root', tmp()], {encoding: 'utf8'});
  assert.equal(r.status, 1);
  assert.match(r.stdout, /AGENTS\.md not found/);
});

test('product-untouched: not-requested without --base, usage error when forced, FAIL when a product file changed', () => {
  const layer = LAYERS.find((l) => l.id === 'product-untouched');
  assert.equal(layer.run({root: tmp(), base: null}).state, 'not-requested');
  const forced = runVerify(['--only', 'product-untouched'], LAYERS);
  assert.equal(forced.code, 2);
  assert.match(forced.err, /needs --base/);

  const root = tmp();
  git(root, 'init', '-q');
  writeFileSync(join(root, 'server.js'), 'a\n');
  writeFileSync(join(root, 'notes.txt'), 'a\n');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'init');
  writeFileSync(join(root, 'notes.txt'), 'b\n');
  assert.equal(layer.run({root, base: 'HEAD'}).ok, true, 'a non-product change is allowed');
  writeFileSync(join(root, 'server.js'), 'b\n');
  const changed = layer.run({root, base: 'HEAD'});
  assert.equal(changed.ok, false);
  assert.match(changed.output, /server\.js/);
  assert.equal(layer.run({root, base: 'no-such-ref'}).ok, false, 'a bad ref is a failure, not a pass');
});

test('impact: parseRequirements reads evidence bullets and ignores other keys', () => {
  const reqs = parseRequirements('## 핵심\n\n### R-001 첫째\nlayer: core\nevidence:\n- server.js:3-4\n- a/b.js:9\ngolden:\n- secured/x:1\n\n### R-002 둘째\nevidence:\n');
  assert.deepEqual(reqs.map((r) => r.id), ['R-001', 'R-002']);
  assert.deepEqual(reqs[0].evidence, [{file: 'server.js', from: 3, to: 4}, {file: 'a/b.js', from: 9, to: 9}]);
  assert.deepEqual(reqs[1].evidence, []);
});

function impactRepo() {
  const root = tmp();
  for (const dir of ['docs/ssot', 'test/golden', 'web/src']) mkdirSync(join(root, dir), {recursive: true});
  git(root, 'init', '-q');
  writeFileSync(join(root, 'docs/ssot/requirements.md'), [
    '## 핵심', '', '### R-001 서버 요구', 'evidence:', '- server.js:1-2', '', '### R-002 다른 요구', 'evidence:', '- other.js:1', '',
  ].join('\n'));
  writeFileSync(join(root, 'test/golden/legacy-portal.json'), JSON.stringify({
    secured: {'static-index-admin': {request: 'GET /'}, health: {request: 'GET /health'}, 'api-list': {request: 'GET /api/tasks'}, 'page-not-found': {request: 'GET /nope'}},
  }));
  writeFileSync(join(root, 'test/char.test.js'), "// R-001\ntest('[R-002] x', () => {});\n");
  writeFileSync(join(root, 'server.js'), 'one\ntwo\n');
  writeFileSync(join(root, 'other.js'), 'one\n');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'init');
  return root;
}
const runImpact = (argv) => {
  const {buf, io} = capture();
  return {code: impactMain(argv, io), ...buf};
};

test('impact: lists the requirement whose evidence file is in the diff, its tests, and possible golden labels', () => {
  const root = impactRepo();
  writeFileSync(join(root, 'server.js'), 'one\nchanged\n');
  const r = runImpact(['--base', 'HEAD', '--root', root]);
  assert.equal(r.code, 0);
  assert.match(r.out, /R-001 서버 요구: server\.js/);
  assert.doesNotMatch(r.out, /R-002 다른 요구/);
  assert.match(r.out, /R-001: test\/char\.test\.js:1/);
  assert.match(r.out, /possible \(server\.js changed\): 2 API labels: secured\/health, secured\/api-list/);
  assert.doesNotMatch(r.out, /static-index-admin/);
  assert.match(r.out, /graft: not installed \(run sh scripts\/setup-graft\.sh\)/);
});

test('impact: a public/ change lists static labels; no change lists nothing', () => {
  const root = impactRepo();
  mkdirSync(join(root, 'public'));
  writeFileSync(join(root, 'public/app.js'), 'x');
  const r = runImpact(['--base', 'HEAD', '--root', root]);
  assert.match(r.out, /possible \(public\/ changed\): secured\/static-index-admin/);
  assert.doesNotMatch(r.out, /R-001 서버/);

  const clean = runImpact(['--base', 'HEAD', '--root', impactRepo()]);
  assert.match(clean.out, /0 changed file/);
  assert.doesNotMatch(clean.out, /R-001 서버/);
});

test('impact: unknown base, unknown flag and a non-git root exit 2', () => {
  const root = impactRepo();
  assert.equal(runImpact(['--base', 'no-such-ref', '--root', root]).code, 2);
  assert.equal(runImpact(['--bogus']).code, 2);
  assert.equal(runImpact(['--root', tmp()]).code, 2);
  const cli = spawnSync('node', [join(here, 'impact.mjs'), '--base', 'no-such-ref', '--root', root], {encoding: 'utf8'});
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /unknown base ref/);
});
