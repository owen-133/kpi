// Tests for scripts/setup-graft.sh and scripts/graft.
// Run: node --test scripts/setup-graft.test.mjs
//
// Every test builds a throw-away git repo and puts shim executables for npm
// (and a decoy graft) first on PATH, so there is no network and no real install.
// node itself is the real one (the script uses `node -p`), linked into the shim
// directory so a test can also leave it out.
// untested: the real `npm ci` download/install and the real graft build.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync,
  realpathSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const realRepo = resolve(here, '..');
const sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'setup-graft-test-')));
after(() => rmSync(sandbox, { recursive: true, force: true }));

const PINNED = JSON.parse(
  readFileSync(join(realRepo, 'tools/graft/package.json'), 'utf8'),
).dependencies['@nanonets/graft'];

const FAKE_NPM = `#!/bin/sh
echo "$PWD :: $*" >> "$FAKE_LOG_DIR/npm.log"
if [ "\${FAKE_NPM_FAIL:-0}" = 1 ]; then
  echo "fake-npm: simulated install failure" >&2
  exit 1
fi
mkdir -p node_modules/.bin node_modules/@nanonets/graft
printf '{"name":"@nanonets/graft","version":"%s"}\\n' "$FAKE_VERSION" > node_modules/@nanonets/graft/package.json
cp "$FAKE_GRAFT_IMPL" node_modules/.bin/graft
chmod +x node_modules/.bin/graft
`;

// FAKE_GRAFT_MODE: ok | fail | gitignore
const FAKE_GRAFT = `#!/bin/sh
echo "$PWD :: $* :: DO_NOT_TRACK=\${DO_NOT_TRACK-unset} GRAFT_NO_GITIGNORE=\${GRAFT_NO_GITIGNORE-unset} GRAFT_NO_IGNORE=\${GRAFT_NO_IGNORE-unset}" >> "$FAKE_LOG_DIR/graft.log"
echo "FAKE-GRAFT-REAL $*"
case "\${FAKE_GRAFT_MODE:-ok}" in
  fail) echo "fake-graft: simulated build failure" >&2; exit 7 ;;
  gitignore) echo "graft/" > .gitignore ;;
esac
mkdir -p graft
echo map > graft/map.json
`;

const DECOY_GRAFT = `#!/bin/sh
echo DECOY
echo called >> "$FAKE_LOG_DIR/decoy.log"
exit 99
`;

function writeExec(path, body) {
  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, {
    cwd, encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

let counter = 0;
// Builds a committed temp repo plus a shim dir. withNode/withNpm control the shim contents.
function makeEnv({ withNode = true, withNpm = true } = {}) {
  const root = join(sandbox, `case-${++counter}`);
  const repo = join(root, 'repo');
  const shims = join(root, 'shims');
  const logs = join(root, 'logs');
  for (const d of [join(repo, 'scripts'), join(repo, 'tools/graft'), shims, logs]) {
    mkdirSync(d, { recursive: true });
  }
  for (const f of ['scripts/setup-graft.sh', 'scripts/graft',
    'tools/graft/package.json', 'tools/graft/package-lock.json']) {
    copyFileSync(join(realRepo, f), join(repo, f));
  }
  git(repo, 'init', '-q');
  git(repo, 'add', '-A');
  git(repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'fixture');

  if (withNode) symlinkSync(process.execPath, join(shims, 'node'));
  if (withNpm) writeExec(join(shims, 'npm'), FAKE_NPM);
  writeExec(join(shims, 'graft'), DECOY_GRAFT); // must never run
  writeExec(join(root, 'graft-impl'), FAKE_GRAFT);

  const env = {
    PATH: `${shims}:/usr/bin:/bin`,
    HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    FAKE_LOG_DIR: logs,
    FAKE_GRAFT_IMPL: join(root, 'graft-impl'),
    FAKE_VERSION: PINNED,
  };
  return { root, repo, shims, logs, env };
}

function run(script, cwd, env, args = []) {
  const r = spawnSync('/bin/sh', [script, ...args], { cwd, env, encoding: 'utf8' });
  assert.equal(r.error, undefined, `spawn failed: ${r.error}`);
  return r;
}

const setup = (repo) => join(repo, 'scripts/setup-graft.sh');
const excludeLines = (repo) => {
  const p = join(git(repo, 'rev-parse', '--git-common-dir').replace(/^(?!\/)/, repo + '/'), 'info/exclude');
  return readFileSync(p, 'utf8').split('\n').filter((l) => l === '/graft/').length;
};
const noDecoy = (e, r) => {
  assert.ok(!existsSync(join(e.logs, 'decoy.log')), 'decoy graft on PATH was executed');
  assert.ok(!`${r.stdout}${r.stderr}`.includes('DECOY'), 'DECOY printed');
};

test('exit 0: installs, builds, excludes graft/, and a second run keeps one exclude line', () => {
  const e = makeEnv();
  const first = run(setup(e.repo), e.repo, e.env);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, new RegExp(`setup-graft: graft ${PINNED.replace(/\./g, '\\.')} ready`));
  assert.ok(existsSync(join(e.repo, 'graft/map.json')));
  assert.equal(excludeLines(e.repo), 1);
  assert.match(readFileSync(join(e.logs, 'npm.log'), 'utf8'), /tools\/graft :: ci --ignore-scripts/);
  const graftLog = readFileSync(join(e.logs, 'graft.log'), 'utf8');
  assert.match(graftLog, /:: build :: DO_NOT_TRACK=1 GRAFT_NO_GITIGNORE=1 GRAFT_NO_IGNORE=1/);

  const second = run(setup(e.repo), e.repo, e.env);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(excludeLines(e.repo), 1, 'second run duplicated the exclude line');
  noDecoy(e, second);
});

test('exit 2: node missing from PATH', () => {
  const e = makeEnv({ withNode: false });
  const probe = spawnSync('/bin/sh', ['-c', 'command -v node'], { env: e.env, encoding: 'utf8' });
  assert.notEqual(probe.status, 0, `precondition: node must not be on ${e.env.PATH}`);
  const r = run(setup(e.repo), e.repo, e.env);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /setup-graft: 'node' not found on PATH/);
  assert.ok(!existsSync(join(e.logs, 'npm.log')), 'npm must not run after the check fails');
});

test('exit 2: npm missing from PATH', () => {
  const e = makeEnv({ withNpm: false });
  const probe = spawnSync('/bin/sh', ['-c', 'command -v npm'], { env: e.env, encoding: 'utf8' });
  assert.notEqual(probe.status, 0, `precondition: npm must not be on ${e.env.PATH}`);
  const r = run(setup(e.repo), e.repo, e.env);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /setup-graft: 'npm' not found on PATH/);
});

test('exit 3: npm ci fails', () => {
  const e = makeEnv();
  const r = run(setup(e.repo), e.repo, { ...e.env, FAKE_NPM_FAIL: '1' });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /setup-graft: 'npm ci --ignore-scripts' failed in .*tools\/graft/);
  assert.ok(!existsSync(join(e.repo, 'graft')), 'no map may be built after a failed install');
});

test('exit 4: installed graft version differs from the pin', () => {
  const e = makeEnv();
  const r = run(setup(e.repo), e.repo, { ...e.env, FAKE_VERSION: '9.9.9' });
  assert.equal(r.status, 4);
  assert.match(r.stderr, new RegExp(`setup-graft: installed graft 9\\.9\\.9, pinned ${PINNED.replace(/\./g, '\\.')}`));
  assert.ok(!existsSync(join(e.logs, 'graft.log')), 'graft must not run with the wrong version');
});

test('exit 5: graft build fails', () => {
  const e = makeEnv();
  const r = run(setup(e.repo), e.repo, { ...e.env, FAKE_GRAFT_MODE: 'fail' });
  assert.equal(r.status, 5);
  assert.match(r.stderr, /setup-graft: 'graft build' failed/);
  assert.match(r.stderr, /fake-graft: simulated build failure/, 'graft stderr must stay visible');
});

test('exit 6: graft writes a .gitignore into the repo', () => {
  const e = makeEnv();
  const r = run(setup(e.repo), e.repo, { ...e.env, FAKE_GRAFT_MODE: 'gitignore' });
  assert.equal(r.status, 6);
  assert.match(r.stderr, /setup-graft: graft changed ignore files:/);
  assert.match(r.stderr, /\.gitignore/);
});

test('exit 6: graft/ is not ignored (tracked .gitignore re-includes it over the exclude line)', () => {
  const e = makeEnv();
  // A committed .gitignore outranks .git/info/exclude, so the appended /graft/ line is overridden.
  writeFileSync(join(e.repo, '.gitignore'), '!/graft/\n');
  git(e.repo, 'add', '.gitignore');
  git(e.repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'reinclude');
  const r = run(setup(e.repo), e.repo, e.env);
  assert.equal(r.status, 6);
  assert.match(r.stderr, /setup-graft: graft\/ is not ignored by git/);
  assert.ok(!r.stderr.includes('graft changed ignore files'), 'must be the not-ignored branch');
});

test('wrapper: exit 3 when the pinned binary is missing, and a graft on PATH is never run', () => {
  const e = makeEnv();
  const r = run(join(e.repo, 'scripts/graft'), e.repo, e.env, ['--version']);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /graft: pinned binary not found at .*tools\/graft\/node_modules\/\.bin\/graft; run: sh scripts\/setup-graft\.sh/);
  assert.equal(r.stdout, '');
  noDecoy(e, r);
});

test('wrapper: runs the repo binary with the required environment, never the PATH graft', () => {
  const e = makeEnv();
  const bin = join(e.repo, 'tools/graft/node_modules/.bin');
  mkdirSync(bin, { recursive: true });
  writeExec(join(bin, 'graft'), FAKE_GRAFT);
  const r = run(join(e.repo, 'scripts/graft'), e.repo, e.env, ['query', 'x']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /FAKE-GRAFT-REAL query x/);
  assert.match(readFileSync(join(e.logs, 'graft.log'), 'utf8'),
    /:: query x :: DO_NOT_TRACK=1 GRAFT_NO_GITIGNORE=1 GRAFT_NO_IGNORE=1/);
  noDecoy(e, r);
  // graft's own exit code is passed through
  const failed = run(join(e.repo, 'scripts/graft'), e.repo, { ...e.env, FAKE_GRAFT_MODE: 'fail' }, ['build']);
  assert.equal(failed.status, 7);
});

test('linked worktree: installs in its own tools/graft, exclude line goes to the common git dir', () => {
  const e = makeEnv();
  const wt = join(e.root, 'linked');
  git(e.repo, 'worktree', 'add', '-q', '-b', 'wt-branch', wt);
  const common = realpathSync(join(e.repo, '.git'));
  assert.equal(realpathSync(resolve(wt, git(wt, 'rev-parse', '--git-common-dir'))), common);

  const r = run(setup(wt), wt, e.env);
  assert.equal(r.status, 0, r.stderr);

  const commonExclude = readFileSync(join(common, 'info/exclude'), 'utf8').split('\n');
  assert.equal(commonExclude.filter((l) => l === '/graft/').length, 1);
  const privateGitDir = realpathSync(resolve(wt, git(wt, 'rev-parse', '--git-dir')));
  assert.notEqual(privateGitDir, common);
  assert.ok(!existsSync(join(privateGitDir, 'info/exclude')), 'exclude line leaked into the per-worktree git dir');

  assert.ok(existsSync(join(wt, 'tools/graft/node_modules/.bin/graft')), 'install missing in the worktree');
  assert.ok(existsSync(join(wt, 'graft/map.json')), 'map missing in the worktree');
  assert.ok(!existsSync(join(e.repo, 'tools/graft/node_modules')), 'main checkout was touched');
  assert.ok(!existsSync(join(e.repo, 'graft')), 'main checkout got a map');
  assert.match(readFileSync(join(e.logs, 'npm.log'), 'utf8'), new RegExp(`${wt}/tools/graft :: ci --ignore-scripts`));
  noDecoy(e, r);
});
