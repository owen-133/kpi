// Tests for web/scripts/new-usecase.ts. The generator only ever writes into temp roots here (--root), never into web/src.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scanTree, formatViolations } from './architecture.helpers.ts';
import { checkAll, formatViolations as formatSsot, parseRequirements } from './ssot.helpers.ts';
import type { Corpus } from './ssot.helpers.ts';

const WEB = path.resolve(import.meta.dirname, '..');
const SCRIPT = path.join(WEB, 'scripts', 'new-usecase.ts');
const TSC = path.join(WEB, 'node_modules', 'typescript', 'bin', 'tsc');
const REQUIREMENTS = path.join('docs', 'ssot', 'requirements.md');
const roots: string[] = [];

after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

// A minimal repository root: 32 filler entries (all grandfathered, no home needed).
// Requirement ids are built, never written out: ssot.spec.ts reads every R-NNN literal in a spec as a test tag.
const requirementId = (n: number): string => `R-${String(n).padStart(3, '0')}`;
function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-spec-'));
  roots.push(root);
  const filler = Array.from({ length: 32 }, (_, i) => {
    const id = requirementId(i + 1);
    return `### ${id} Filler requirement ${i + 1}\nlayer: supporting\nstatus: planned\n`;
  });
  fs.mkdirSync(path.join(root, 'docs', 'ssot'), { recursive: true });
  fs.writeFileSync(path.join(root, REQUIREMENTS), `# Requirements\n\n${filler.join('\n')}`);
  return root;
}

function generate(root: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const run = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { cwd: root, encoding: 'utf8' });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

// A nested `node --test` must not inherit the parent runner's context, or it prints nothing and always exits 0.
function runNodeTest(root: string, spec: string): { status: number | null; stdout: string; stderr: string } {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', spec], { cwd: root, encoding: 'utf8', env });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

function emptyCorpus(root: string): Corpus {
  return { root, testFiles: [], docFiles: [], agentsText: 'docs/ssot/requirements.md', goldenLabels: new Set() };
}

const BILLING = 'web/src/billing';

describe('scaffold generator: billing / IssueInvoice', () => {
  it('creates the hexagonal tree and the generated tree breaks no architecture rule', () => {
    const root = makeRoot();
    const run = generate(root, ['billing', 'IssueInvoice']);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(listFiles(path.join(root, BILLING)), [
      'adapter/in/web/issueInvoice.scenario.spec.ts',
      'adapter/in/web/issueInvoiceHandler.ts',
      'application/port/in/IssueInvoiceUseCase.ts',
      'application/service/IssueInvoiceService.spec.ts',
      'application/service/IssueInvoiceService.ts',
    ]);
    const { files, violations } = scanTree(path.join(root, 'web', 'src'));
    assert.equal(files.length, 5);
    assert.equal(violations.length, 0, formatViolations(violations));
  });

  it('appends the next free planned requirement and the SSOT check reports no violation', () => {
    const root = makeRoot();
    assert.equal(generate(root, ['billing', 'IssueInvoice']).status, 0);
    assert.equal(generate(root, ['billing', 'VoidInvoice']).status, 0);
    const text = fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8');
    const requirements = parseRequirements(text);
    assert.equal(requirements.length, 34);
    const [first, second] = requirements.slice(32);
    assert.equal(first.id, requirementId(33));
    assert.equal(second.id, requirementId(34));
    assert.equal(first.layer, 'supporting');
    assert.equal(first.status, 'planned');
    assert.equal(first.home, 'web/src/billing/…');
    assert.match(first.title, /IssueInvoice/);
    const violations = checkAll(requirements, emptyCorpus(root));
    assert.equal(violations.length, 0, formatSsot(violations));
  });

  it('the generated service spec is red with a not implemented message (tests first)', () => {
    const root = makeRoot();
    assert.equal(generate(root, ['billing', 'IssueInvoice']).status, 0);
    const spec = path.join(BILLING, 'application', 'service', 'IssueInvoiceService.spec.ts');
    const source = fs.readFileSync(path.join(root, spec), 'utf8');
    assert.match(source, /Given .*\n?/);
    assert.match(source, /When /);
    assert.match(source, /Then /);
    const run = runNodeTest(root, spec);
    assert.notEqual(run.status, 0, 'the generated spec must fail until the service is implemented');
    assert.match(run.stdout + run.stderr, /not implemented/);
  });

  it('the generated scenario spec is a todo: visible in the report, not a failure', () => {
    const root = makeRoot();
    assert.equal(generate(root, ['billing', 'IssueInvoice']).status, 0);
    const spec = path.join(BILLING, 'adapter', 'in', 'web', 'issueInvoice.scenario.spec.ts');
    const run = runNodeTest(root, spec);
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /# todo 1/);
    assert.match(run.stdout, /# fail 0/);
  });

  it('the generated files type-check under the web tsconfig strictness', () => {
    const root = makeRoot();
    assert.equal(generate(root, ['billing', 'IssueInvoice', '--out-port', 'InvoiceRepository', '--out-port', 'Mailer']).status, 0);
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['esnext'],
        module: 'esnext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        isolatedModules: true,
        erasableSyntaxOnly: true,
        allowImportingTsExtensions: true,
        typeRoots: [path.join(WEB, 'node_modules', '@types')],
        types: ['node'],
      },
      include: ['web/src/**/*.ts'],
    };
    fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify(tsconfig));
    const run = spawnSync(process.execPath, [TSC, '-p', path.join(root, 'tsconfig.json')], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout + run.stderr);
  });

  it('prints the container.ts lines the developer adds and does not touch config/container.ts', () => {
    const root = makeRoot();
    const run = generate(root, ['billing', 'IssueInvoice', '--out-port', 'InvoiceRepository']);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /web\/src\/config\/container\.ts/);
    assert.match(run.stdout, /import \{ IssueInvoiceService \} from '\.\.\/billing\/application\/service\/IssueInvoiceService\.ts';/);
    assert.match(run.stdout, /import type \{ IssueInvoiceUseCase \} from '\.\.\/billing\/application\/port\/in\/IssueInvoiceUseCase\.ts';/);
    assert.match(run.stdout, /readonly issueInvoice: IssueInvoiceUseCase;/);
    assert.match(run.stdout, /issueInvoice: new IssueInvoiceService\(/);
    assert.equal(fs.existsSync(path.join(root, 'web', 'src', 'config')), false);
  });
});

describe('scaffold generator: --out-port', () => {
  it('creates the out-port interface and the service takes it through the constructor', () => {
    const root = makeRoot();
    const run = generate(root, ['billing', 'IssueInvoice', '--out-port', 'InvoiceRepository', '--out-port', 'Mailer']);
    assert.equal(run.status, 0, run.stderr);
    const outDir = path.join(root, BILLING, 'application', 'port', 'out');
    assert.deepEqual(listFiles(outDir), ['InvoiceRepository.ts', 'Mailer.ts']);
    assert.match(fs.readFileSync(path.join(outDir, 'InvoiceRepository.ts'), 'utf8'), /export interface InvoiceRepository\b/);
    const service = fs.readFileSync(path.join(root, BILLING, 'application', 'service', 'IssueInvoiceService.ts'), 'utf8');
    assert.match(service, /import type \{ InvoiceRepository \} from '\.\.\/port\/out\/InvoiceRepository\.ts';/);
    assert.match(service, /constructor\(invoiceRepository: InvoiceRepository, mailer: Mailer\)/);
    assert.match(service, /implements IssueInvoiceUseCase/);
    const { violations } = scanTree(path.join(root, 'web', 'src'));
    assert.equal(violations.length, 0, formatViolations(violations));
    assert.match(run.stdout, /new IssueInvoiceService\(.*InvoiceRepository.*Mailer/s);
  });

  it('without --out-port there is no port/out folder and the constructor takes nothing', () => {
    const root = makeRoot();
    assert.equal(generate(root, ['billing', 'IssueInvoice']).status, 0);
    assert.equal(fs.existsSync(path.join(root, BILLING, 'application', 'port', 'out')), false);
    const service = fs.readFileSync(path.join(root, BILLING, 'application', 'service', 'IssueInvoiceService.ts'), 'utf8');
    assert.doesNotMatch(service, /constructor\(/);
  });
});

describe('scaffold generator: refuses to overwrite', () => {
  it('exits 1, lists the existing files, and writes nothing else', () => {
    const root = makeRoot();
    const handler = path.join(root, BILLING, 'adapter', 'in', 'web', 'issueInvoiceHandler.ts');
    fs.mkdirSync(path.dirname(handler), { recursive: true });
    fs.writeFileSync(handler, '// mine\n');
    const before = fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8');
    const run = generate(root, ['billing', 'IssueInvoice']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /issueInvoiceHandler\.ts/);
    assert.equal(fs.readFileSync(handler, 'utf8'), '// mine\n');
    assert.deepEqual(listFiles(path.join(root, BILLING)), ['adapter/in/web/issueInvoiceHandler.ts']);
    assert.equal(fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8'), before);
  });

  it('a second run for the same use case exits 1 and keeps the first requirement count', () => {
    const root = makeRoot();
    assert.equal(generate(root, ['billing', 'IssueInvoice']).status, 0);
    const after = fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8');
    const run = generate(root, ['billing', 'IssueInvoice']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /IssueInvoiceService\.ts/);
    assert.equal(fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8'), after);
  });

  it('a root without docs/ssot/requirements.md exits 1 and writes nothing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-spec-'));
    roots.push(root);
    const run = generate(root, ['billing', 'IssueInvoice']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /requirements\.md/);
    assert.deepEqual(listFiles(root), []);
  });
});

describe('scaffold generator: usage errors exit 2 and write nothing', () => {
  const cases: Array<[string, string[]]> = [
    ['no arguments', []],
    ['only a context', ['billing']],
    ['too many positionals', ['billing', 'IssueInvoice', 'Extra']],
    ['context with a capital', ['Billing', 'IssueInvoice']],
    ['context starting with a digit', ['1billing', 'IssueInvoice']],
    ['context with an underscore', ['bill_ing', 'IssueInvoice']],
    ['context with a path separator', ['../billing', 'IssueInvoice']],
    ['reserved context app', ['app', 'IssueInvoice']],
    ['reserved context config', ['config', 'IssueInvoice']],
    ['reserved context domain', ['domain', 'IssueInvoice']],
    ['use case in camelCase', ['billing', 'issueInvoice']],
    ['use case with an underscore', ['billing', 'Issue_Invoice']],
    ['use case in capitals', ['billing', 'ISSUE']],
    ['use case with a path separator', ['billing', 'a/b']],
    ['out-port in camelCase', ['billing', 'IssueInvoice', '--out-port', 'invoiceRepository']],
    ['out-port without a value', ['billing', 'IssueInvoice', '--out-port']],
    ['the same out-port twice', ['billing', 'IssueInvoice', '--out-port', 'Mailer', '--out-port', 'Mailer']],
    ['unknown option', ['billing', 'IssueInvoice', '--force']],
  ];
  for (const [label, args] of cases) {
    it(label, () => {
      const root = makeRoot();
      const before = fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8');
      const run = generate(root, args);
      assert.equal(run.status, 2, run.stdout + run.stderr);
      assert.match(run.stderr, /usage|must|unknown|reserved|duplicate|missing/i);
      assert.deepEqual(listFiles(path.join(root, 'web')), []);
      assert.equal(fs.readFileSync(path.join(root, REQUIREMENTS), 'utf8'), before);
    });
  }

  it('--root without a value', () => {
    const run = spawnSync(process.execPath, [SCRIPT, 'billing', 'IssueInvoice', '--root'], { encoding: 'utf8' });
    assert.equal(run.status, 2);
  });
});
