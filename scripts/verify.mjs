#!/usr/bin/env node
// One command that runs every verification layer and reports all of them.
//
// Usage: node scripts/verify.mjs [--only <layer>[,<layer>...]] [--skip <layer>[,<layer>...]]
//                                [--base <ref>] [--root <dir>]
//   --only   run just these layers          --skip  leave these layers out
//   --base   enables product-untouched: the deploy and database files (PRODUCT_PATHS) must equal <ref>
//   --root   repo root to verify (default: the repo containing this script)
// Layers run one after another (the heavy ones share ports) and never stop at the
// first failure. Output: a table `layer | result | seconds | note`, the last 15
// output lines of every failed layer, then `VERIFY: PASS` or `VERIFY: FAIL (<layers>)`.
// Exit: 0 every selected layer passed, 1 some layer failed, 2 usage error.
// Adding a layer = adding one entry to LAYERS below.
import {spawnSync} from 'node:child_process';
import {existsSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const USAGE = 'usage: node scripts/verify.mjs [--only <layer>[,<layer>...]] [--skip <layer>[,<layer>...]] [--base <ref>] [--root <dir>]';
const AGENTS_LIMIT = 32768;
const PRODUCT_PATHS = ['render.yaml', 'supabase', 'package.json', 'README.md', 'DEPLOY.md', 'KPI_GUIDE.md'];

class UsageError extends Error {}

// Runs a command, returns {ok, output, note?}. A command that cannot start is a failure.
function exec(command, args, {cwd, env, okNote = ''} = {}) {
  const r = spawnSync(command, args, {cwd, env: env ?? process.env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.error) return {ok: false, output: `${output}${r.error.message}\n`, note: `cannot run ${command}: ${r.error.code ?? r.error.message}`};
  if (r.status === null) return {ok: false, output, note: `killed by ${r.signal}`};
  return {ok: r.status === 0, output, note: r.status === 0 ? okNote : `exit ${r.status}`, status: r.status};
}

function rootTests({root}) {
  const helper = join(root, 'scripts/env-for-tests.mjs');
  let skipped = '';
  let command = ['npm', ['test']];
  if (!existsSync(helper)) skipped = 'scripts/env-for-tests.mjs not found';
  else {
    const probe = exec('node', [helper], {cwd: root});
    if (probe.ok) command = ['sh', ['-c', 'eval "$(node scripts/env-for-tests.mjs)" && exec npm test']];
    else skipped = (probe.output.trim().split('\n')[0] || `env helper exit ${probe.status}`).replace(/^env-for-tests: /, '').slice(0, 110);
  }
  const r = exec(command[0], command[1], {cwd: root});
  const envNote = skipped ? `env-skipped: ${skipped}` : 'full-env';
  return {...r, note: r.ok ? envNote : `${r.note}; ${envNote}`};
}

// `npm audit` needs the registry. Its exit 1 means either advisories at or above --audit-level or "could not ask";
// only the second prints `audit request to <url> failed, reason: <cause>`, which is reported as env-skipped like
// the other layers that lack their environment. Anything else that exits non-zero is a real failure.
function audit({root}) {
  const r = exec('npm', ['--prefix', 'web', 'audit', '--omit=dev', '--audit-level=high'], {cwd: root});
  if (r.ok) return r;
  const unreachable = r.output.match(/audit request to \S+ failed, reason: (.*)$/m);
  if (!unreachable) return r;
  const cause = unreachable[1].match(/\bE[A-Z_]{3,}\b/)?.[0] ?? unreachable[1].trim().slice(0, 60);
  return {ok: true, output: r.output, note: `env-skipped: npm registry unreachable (${cause})`};
}

const web = (args) => ({root}) => exec(args[0], args.slice(1), {cwd: join(root, 'web')});

export const LAYERS = [
  {id: 'root-tests', run: rootTests},
  {id: 'web-tests', run: web(['npm', 'test'])},
  // --no-install: a missing typescript must fail here, never be fetched from the network.
  {id: 'web-types', run: web(['npx', '--no-install', 'tsc', '--noEmit'])},
  {id: 'web-build', run: web(['npm', 'run', 'build'])},
  {id: 'generated', run: ({root}) => exec('node', ['scripts/check-generated.mjs'], {cwd: root})},
  {
    id: 'graft',
    run: ({root}) => {
      const r = exec('sh', ['scripts/graft', 'build', '--check'], {cwd: root});
      return r.status === 3 ? {...r, note: 'pinned graft missing: run `sh scripts/setup-graft.sh`'} : r;
    },
  },
  {id: 'audit', run: audit},
  {
    id: 'agents-size',
    run: ({root}) => {
      const file = join(root, 'AGENTS.md');
      if (!existsSync(file)) return {ok: false, note: 'AGENTS.md not found', output: ''};
      const bytes = statSync(file).size;
      return {ok: bytes < AGENTS_LIMIT, note: `${bytes} bytes (limit ${AGENTS_LIMIT - 1})`, output: ''};
    },
  },
  {
    id: 'product-untouched',
    optional: true,
    run: ({root, base}) => {
      if (!base) return {state: 'not-requested', note: 'pass --base <ref> to enable'};
      const r = exec('git', ['diff', '--stat', base, '--', ...PRODUCT_PATHS], {cwd: root});
      if (!r.ok) return {...r, note: `git diff failed (${r.note})`};
      return r.output.trim() === '' ? {ok: true, note: `clean against ${base}`, output: ''} : {ok: false, note: `product files differ from ${base}`, output: r.output};
    },
  },
];

export function parseArgs(argv, ids = LAYERS.map((layer) => layer.id)) {
  const opts = {only: null, skip: [], base: null, root: resolve(dirname(fileURLToPath(import.meta.url)), '..')};
  const value = (i, flag) => {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new UsageError(`${flag} needs a value`);
    return argv[i + 1];
  };
  const list = (text, flag) => {
    const items = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) throw new UsageError(`${flag} needs at least one layer`);
    const unknown = items.filter((id) => !ids.includes(id));
    if (unknown.length) throw new UsageError(`unknown layer: ${unknown.join(', ')} (known: ${ids.join(', ')})`);
    return items;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--only') opts.only = list(value(i++, arg), arg);
    else if (arg === '--skip') opts.skip.push(...list(value(i++, arg), arg));
    else if (arg === '--base') opts.base = value(i++, arg);
    else if (arg === '--root') opts.root = resolve(value(i++, arg));
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  return opts;
}

export function formatTable(rows) {
  const header = ['layer', 'result', 'seconds', 'note'];
  const cells = [header, ...rows.map((r) => [r.id, r.result, r.seconds, r.note])];
  const width = header.map((_, c) => Math.max(...cells.map((row) => String(row[c]).length)));
  const line = (row) => row.map((cell, c) => (c === row.length - 1 ? String(cell) : String(cell).padEnd(width[c]))).join(' | ');
  return [line(header), width.slice(0, -1).map((w) => '-'.repeat(w)).join('-+-') + '-+-----', ...cells.slice(1).map(line)].join('\n');
}

const tail = (text, n = 15) => text.replace(/\n+$/, '').split('\n').slice(-n).join('\n');

// Runs the selected layers in order. A layer that throws is a failed layer, not a crash.
export function runLayers(layers, ctx) {
  const rows = [];
  for (const layer of layers) {
    const started = process.hrtime.bigint();
    let outcome;
    try {
      outcome = layer.run(ctx);
    } catch (error) {
      outcome = {ok: false, note: `threw: ${error.message}`, output: error.stack ?? ''};
    }
    const seconds = (Number(process.hrtime.bigint() - started) / 1e9).toFixed(1);
    const result = outcome.state ?? (outcome.ok ? 'PASS' : 'FAIL');
    rows.push({id: layer.id, result, seconds, note: outcome.note ?? '', output: outcome.output ?? ''});
  }
  return rows;
}

export function main(argv, {layers = LAYERS, out = (s) => process.stdout.write(s), err = (s) => process.stderr.write(s)} = {}) {
  let opts;
  try {
    opts = parseArgs(argv, layers.map((layer) => layer.id));
    if (!existsSync(opts.root) || !statSync(opts.root).isDirectory()) throw new UsageError(`--root is not a directory: ${opts.root}`);
    if (opts.only?.includes('product-untouched') && !opts.base) throw new UsageError('product-untouched needs --base <ref>');
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    err(`verify: ${error.message}\n${USAGE}\n`);
    return 2;
  }
  const selected = layers.filter((layer) => (opts.only ? opts.only.includes(layer.id) : true) && !opts.skip.includes(layer.id));
  if (!selected.length) {
    err(`verify: no layer selected\n${USAGE}\n`);
    return 2;
  }
  const rows = runLayers(selected, {root: opts.root, base: opts.base});
  out(`${formatTable(rows)}\n`);
  const failed = rows.filter((r) => r.result === 'FAIL');
  for (const r of failed) out(`\n--- ${r.id}: last 15 lines ---\n${tail(r.output) || r.note || '(no output)'}\n`);
  out(`\n${failed.length ? `VERIFY: FAIL (${failed.map((r) => r.id).join(', ')})` : 'VERIFY: PASS'}\n`);
  return failed.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
