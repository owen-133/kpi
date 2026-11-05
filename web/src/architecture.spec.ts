// Machine-checked architecture rules. Checking functions live in architecture.helpers.ts.
import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkAppBoundary,
  checkContainerOnly,
  checkOrmOnlyInPersistence,
  checkRule1,
  checkRule2,
  checkRule6,
  collectFiles,
  formatViolations,
  placementOfFile,
  scanTree,
  type Layer,
  type RuleId,
  type Violation,
} from './architecture.helpers.ts';

const SRC = import.meta.dirname;
const FIXTURES = path.resolve(SRC, '..', 'arch-fixtures');

type Checker = (file: string, source: string) => Violation[];

function filesIn(root: string, layers: Layer[], side?: string): string[] {
  return collectFiles(root).filter((file) => {
    const where = placementOfFile(file);
    return where !== null && layers.includes(where.layer) && (side === undefined || where.side === side);
  });
}

// Runs the checker over the files; skips with an explicit message when no file exists.
function runRule(t: TestContext, label: string, files: string[], check: Checker): void {
  const dirs = [...new Set(files.map((f) => path.relative(SRC, path.dirname(f)) || '.'))];
  const summary = `${label}: scanned ${files.length} files in [${dirs.join(', ')}]`;
  t.diagnostic(summary);
  if (files.length === 0) {
    t.skip(`${label}: no files found, folder missing under ${SRC}`);
    return;
  }
  const violations = files.flatMap((file) => check(file, fs.readFileSync(file, 'utf8')));
  assert.strictEqual(violations.length, 0, `${summary}\n${formatViolations(violations)}`);
}

describe('architecture rules on the real tree', () => {
  it('rule 1: domain and application import no package and no adapter', (t) => {
    runRule(t, 'rule 1', filesIn(SRC, ['domain', 'application']), checkRule1);
  });

  it('rule 2: domain has no setter and no public mutable field', (t) => {
    runRule(t, 'rule 2', filesIn(SRC, ['domain']), checkRule2);
  });

  it('rule 6: adapters stay in their package and use only ports from the core', (t) => {
    runRule(t, 'rule 6', filesIn(SRC, ['adapter']), checkRule6);
  });

  it('app routes import nothing deeper than adapter/in/web', (t) => {
    runRule(t, 'app boundary', filesIn(SRC, ['app']), checkAppBoundary);
  });

  it('only config/container.ts imports adapter/out', (t) => {
    const outFiles = filesIn(SRC, ['adapter'], 'out');
    if (outFiles.length === 0) {
      t.diagnostic('container-only: no files under adapter/out');
      t.skip('container-only: adapter/out missing, nothing to protect yet');
      return;
    }
    runRule(t, 'container-only', collectFiles(SRC), checkContainerOnly);
  });

  it('ORM and driver packages are imported only under adapter/out/persistence and config/{container,database}.ts', (t) => {
    runRule(t, 'orm-only', collectFiles(SRC), checkOrmOnlyInPersistence);
  });
});

function fixtureFile(...parts: string[]): string {
  return path.join(FIXTURES, ...parts);
}

function detects(check: Checker, rule: RuleId, file: string, needle: string): void {
  assert.ok(fs.existsSync(file), `fixture missing: ${file}`);
  const violations = check(file, fs.readFileSync(file, 'utf8'));
  const hit = violations.filter((v) => v.rule === rule && v.message.includes(needle));
  assert.ok(hit.length > 0, `${rule} not detected in ${file} (needle '${needle}'); got:\n${formatViolations(violations)}`);
}

describe('architecture checks fire on violation fixtures', () => {
  it('fixture: arch-fixtures directory exists and has files', () => {
    const files = collectFiles(FIXTURES);
    assert.ok(files.length > 0, `no fixtures under ${FIXTURES}`);
  });

  it('fixture: rule 1 flags domain importing react', () => {
    detects(checkRule1, 'R1', fixtureFile('r1-react/src/request/domain/BadReactImport.ts'), "'react'");
  });

  it('fixture: rule 1 flags domain importing next/server', () => {
    detects(checkRule1, 'R1', fixtureFile('r1-next/src/request/domain/BadNextImport.ts'), "'next/server'");
  });

  it('fixture: rule 1 flags application importing an adapter path', () => {
    detects(checkRule1, 'R1', fixtureFile('r1-adapter-path/src/request/application/service/BadAdapterImport.ts'), 'adapter');
  });

  it('fixture: rule 2 flags a setter method', () => {
    detects(checkRule2, 'R2', fixtureFile('r2-setter/src/request/domain/BadSetterMethod.ts'), 'setStatus(');
  });

  it('fixture: rule 2 flags a setter accessor', () => {
    detects(checkRule2, 'R2', fixtureFile('r2-setter/src/request/domain/BadSetterAccessor.ts'), 'set status(');
  });

  it('fixture: rule 2 flags @Setter', () => {
    detects(checkRule2, 'R2', fixtureFile('r2-setter/src/request/domain/BadSetterDecorator.ts'), '@Setter');
  });

  it('fixture: rule 2 flags a public mutable field', () => {
    detects(checkRule2, 'R2', fixtureFile('r2-public-field/src/request/domain/BadPublicField.ts'), "field 'status'");
  });

  it('fixture: rule 6 flags adapter/in importing adapter/out', () => {
    detects(checkRule6, 'R6', fixtureFile('r6-cross-adapter/src/request/adapter/in/web/BadImportsOutAdapter.ts'), 'adapter out/persistence');
  });

  it('fixture: rule 6 flags an adapter importing an application service', () => {
    detects(checkRule6, 'R6', fixtureFile('r6-adapter-service/src/request/adapter/out/persistence/BadImportsService.ts'), 'application outside port');
  });

  it('fixture: app boundary flags a route importing domain', () => {
    detects(checkAppBoundary, 'APP', fixtureFile('app-domain/src/app/bad/page.ts'), 'domain');
  });

  it('fixture: app boundary flags a route importing adapter/out', () => {
    detects(checkAppBoundary, 'APP', fixtureFile('app-adapter-out/src/app/bad/page.ts'), 'adapter out/persistence');
  });

  it('fixture: container-only flags a non-container file importing adapter/out', () => {
    detects(checkContainerOnly, 'CONTAINER', fixtureFile('container-only/src/lib/BadImportsOut.ts'), 'adapter/out');
  });

  it('fixture: ORM rule flags an application service importing drizzle-orm', () => {
    detects(checkOrmOnlyInPersistence, 'ORM', fixtureFile('orm-in-application/src/request/application/service/BadOrmImport.ts'), "'drizzle-orm'");
  });

  it('fixture: ORM rule flags a route importing postgres', () => {
    detects(checkOrmOnlyInPersistence, 'ORM', fixtureFile('orm-in-app-route/src/app/bad/page.ts'), "'postgres'");
  });

  it('fixture: compliant tree produces no violations and is non-trivial', () => {
    const { files, violations } = scanTree(fixtureFile('good'));
    assert.ok(files.length >= 8, `expected the compliant fixture tree to have files, got ${files.length}`);
    assert.strictEqual(violations.length, 0, formatViolations(violations));
  });
});
