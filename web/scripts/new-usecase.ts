// Scaffolds a new use case on the hexagonal path, tests first.
//
//   node web/scripts/new-usecase.ts <context> <UseCaseName> [--out-port <Name>]... [--root <dir>]   (run from the repository root)
//
// Creates under web/src/<context>/ (templates: web/scaffold-templates/*.txt, plain {{placeholders}}):
//   application/port/in/<UseCase>UseCase.ts            input port (interface, command and result types)
//   application/port/out/<Name>.ts                     one output port interface per --out-port
//   application/service/<UseCase>Service.ts            class taking the out ports through its constructor; throws "not implemented"
//   application/service/<UseCase>Service.spec.ts       FAILING Given / When / Then spec with fake ports inside (red first)
//   adapter/in/web/<useCase>Handler.ts                 thin handler, a plain function over the use case, no Next imports
//   adapter/in/web/<useCase>.scenario.spec.ts          scenario stub marked { todo: true }: visible, not failing
// and appends a `planned` requirement (next free R-NNN, home: web/src/<context>/…) to docs/ssot/requirements.md.
// It prints the config/container.ts lines to add by hand; it never edits config/container.ts.
// `--root <dir>` writes below <dir> instead of the repository (the tests use it with a temp dir).
// Nothing is written unless every target is free: an existing file stops the run before the first write.
// Exit codes: 0 done · 1 refused (a target file exists, or <root>/docs/ssot/requirements.md is missing) · 2 usage.
// No dependencies; relative imports with .ts extensions; Node type stripping.
import fs from 'node:fs';
import path from 'node:path';
import { parseRequirements, SSOT_PATH } from '../src/ssot.helpers.ts';

const USAGE = 'usage: node web/scripts/new-usecase.ts <context> <UseCaseName> [--out-port <Name>]... [--root <dir>]';
const CONTEXT = /^[a-z][a-z0-9-]*$/;
// PascalCase words of two or more characters each, so ISSUE and IssueAUser are refused
const PASCAL = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*$/;
// Folder names the architecture checks give a meaning of their own: a context may not take them.
const RESERVED_CONTEXTS = new Set(['app', 'config', 'domain', 'application', 'adapter']);
const TEMPLATES = path.resolve(import.meta.dirname, '..', 'scaffold-templates');
const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

class UsageError extends Error {}

interface Options {
  context: string;
  useCase: string;
  outPorts: string[];
  root: string;
}

function parseArgs(argv: string[]): Options {
  const positionals: string[] = [];
  const outPorts: string[] = [];
  let root = REPO_ROOT;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out-port' || arg === '--root') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`missing value after ${arg}`);
      i++;
      if (arg === '--root') root = path.resolve(value);
      else outPorts.push(value);
    } else if (arg.startsWith('--')) {
      throw new UsageError(`unknown option ${arg}`);
    } else {
      positionals.push(arg);
    }
  }
  if (positionals.length !== 2) throw new UsageError('expected <context> <UseCaseName>');
  const [context, useCase] = positionals;
  if (!CONTEXT.test(context)) throw new UsageError(`context '${context}' must match [a-z][a-z0-9-]*`);
  if (RESERVED_CONTEXTS.has(context)) throw new UsageError(`context '${context}' is reserved (${[...RESERVED_CONTEXTS].join(', ')})`);
  if (!PASCAL.test(useCase)) throw new UsageError(`use case '${useCase}' must be PascalCase, e.g. IssueInvoice`);
  for (const name of outPorts) {
    if (!PASCAL.test(name)) throw new UsageError(`out port '${name}' must be PascalCase, e.g. InvoiceRepository`);
  }
  const duplicate = outPorts.find((name, index) => outPorts.indexOf(name) !== index);
  if (duplicate !== undefined) throw new UsageError(`duplicate out port '${duplicate}'`);
  return { context, useCase, outPorts, root };
}

function render(templateName: string, values: Record<string, string>): string {
  const template = fs.readFileSync(path.join(TEMPLATES, templateName), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`template ${templateName} uses unknown placeholder {{${key}}}`);
    return value;
  });
}

function lowerFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

interface Planned {
  file: string; // path relative to the root, posix
  text: string;
}

function plan(options: Options, requirementId: string): Planned[] {
  const { context, useCase, outPorts } = options;
  const base = `web/src/${context}`;
  const fields = outPorts.map((name) => ({ type: name, variable: lowerFirst(name) }));
  const importLines = (from: string): string =>
    fields.map((f) => `import type { ${f.type} } from '${from}/port/out/${f.type}.ts';\n`).join('');
  const constructorBlock =
    fields.length === 0
      ? ''
      : `  constructor(${fields.map((f) => `${f.variable}: ${f.type}`).join(', ')}) {\n` +
        fields.map((f) => `    this.${f.variable} = ${f.variable};\n`).join('') +
        '  }\n\n';
  const values: Record<string, string> = {
    context,
    UseCase: useCase,
    useCase: lowerFirst(useCase),
    requirementId,
    outPortImports: importLines('..'),
    outPortTypeImports: importLines('..'),
    outPortFields: fields.length === 0 ? '' : fields.map((f) => `  private readonly ${f.variable}: ${f.type};\n`).join('') + '\n',
    constructorBlock,
    givenFakes: fields.map((f) => `    const ${f.variable}: ${f.type} = {}; // TODO fake only the operations this case needs\n`).join(''),
    fakeArguments: fields.map((f) => f.variable).join(', '),
    OutPort: '',
  };
  const files: Planned[] = [
    { file: `${base}/application/port/in/${useCase}UseCase.ts`, text: render('port-in.txt', values) },
    { file: `${base}/application/service/${useCase}Service.ts`, text: render('service.txt', values) },
    { file: `${base}/application/service/${useCase}Service.spec.ts`, text: render('service-spec.txt', values) },
    { file: `${base}/adapter/in/web/${values.useCase}Handler.ts`, text: render('handler.txt', values) },
    { file: `${base}/adapter/in/web/${values.useCase}.scenario.spec.ts`, text: render('scenario-spec.txt', values) },
  ];
  for (const f of fields) {
    files.push({ file: `${base}/application/port/out/${f.type}.ts`, text: render('port-out.txt', { ...values, OutPort: f.type }) });
  }
  return files;
}

function containerLines(options: Options): string {
  const { context, useCase, outPorts } = options;
  const variable = lowerFirst(useCase);
  const args = outPorts.length === 0 ? '' : outPorts.map((name) => `<adapter implementing ${name}>`).join(', ');
  const lines = [
    `import { ${useCase}Service } from '../${context}/application/service/${useCase}Service.ts';`,
    `import type { ${useCase}UseCase } from '../${context}/application/port/in/${useCase}UseCase.ts';`,
  ];
  if (outPorts.length > 0) {
    lines.push(`// plus the adapter/out classes that implement ${outPorts.join(', ')}: only this file may import adapter/out`);
  }
  return [
    'Add to web/src/config/container.ts (this script does not edit it):',
    '',
    ...lines,
    '',
    '  in type Container:',
    `    readonly ${variable}: ${useCase}UseCase;`,
    '',
    '  in createContainer(), inside the returned object:',
    `    ${variable}: new ${useCase}Service(${args}),`,
    '',
  ].join('\n');
}

function main(): number {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }
  const requirementsFile = path.join(options.root, SSOT_PATH);
  if (!fs.existsSync(requirementsFile)) {
    process.stderr.write(`${SSOT_PATH} is missing under ${options.root}; nothing written\n`);
    return 1;
  }
  const requirementsText = fs.readFileSync(requirementsFile, 'utf8');
  const existing = parseRequirements(requirementsText);
  const nextNumber = existing.reduce((max, req) => Math.max(max, Number(req.id.slice(2))), 0) + 1;
  const requirementId = `R-${String(nextNumber).padStart(3, '0')}`;
  const files = plan(options, requirementId);
  const taken = files.filter((f) => fs.existsSync(path.join(options.root, f.file)));
  if (taken.length > 0) {
    process.stderr.write(`refusing to overwrite; these files already exist:\n${taken.map((f) => `  ${f.file}`).join('\n')}\nnothing written\n`);
    return 1;
  }
  for (const f of files) {
    const full = path.join(options.root, f.file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, f.text, { flag: 'wx' });
  }
  const separator = requirementsText.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(requirementsFile, requirementsText + separator + render('requirement.txt', { requirementId, UseCase: options.useCase, context: options.context }));
  process.stdout.write(`created ${files.length} files under ${path.posix.join('web/src', options.context)}/ and appended ${requirementId} (planned) to ${SSOT_PATH}:\n`);
  for (const f of files) process.stdout.write(`  ${f.file}\n`);
  process.stdout.write(`\nRed first: cd web && node --test src/${options.context}/application/service/${options.useCase}Service.spec.ts\n\n${containerLines(options)}`);
  return 0;
}

process.exitCode = main();
