// Prints the requirements index or one requirement block from docs/ssot/requirements.md. Read-only.
//
//   node web/scripts/ssot-show.ts            one line per requirement: `R-NNN start-end status layer home`
//   node web/scripts/ssot-show.ts R-NNN      the lines of that block, undecorated (same text as `sed -n 'start,endp'`)
//
// start is the `### R-NNN` heading line, end the last line before the next heading (or the end of the file);
// an absent status, layer or home prints as `-`. A dropped requirement prints like any other.
// Exit codes: 0 ok · 1 unknown id (stderr) · 2 usage (more than one argument, id not shaped R-NNN).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockEndLines, parseRequirements, SSOT_PATH } from '../src/ssot.helpers.ts';

const ID = /^R-\d{3}$/;
const USAGE = 'usage: node web/scripts/ssot-show.ts [R-NNN]';

export interface ShowResult {
  code: 0 | 1 | 2;
  stdout: string[]; // lines, without the line terminator
  stderr: string[];
}

export function showRequirements(text: string, argv: string[]): ShowResult {
  if (argv.length > 1 || (argv.length === 1 && !ID.test(argv[0]))) return { code: 2, stdout: [], stderr: [USAGE] };
  const reqs = parseRequirements(text);
  const ends = blockEndLines(text, reqs);
  if (argv.length === 0) {
    const index = reqs.map((r, i) => `${r.id} ${r.line}-${ends[i]} ${r.status || '-'} ${r.layer || '-'} ${r.home || '-'}`);
    return { code: 0, stdout: index, stderr: [] };
  }
  const at = reqs.findIndex((r) => r.id === argv[0]);
  if (at < 0) return { code: 1, stdout: [], stderr: [`unknown requirement ${argv[0]}`] };
  const lines = text.split('\n');
  return { code: 0, stdout: lines.slice(reqs[at].line - 1, ends[at]), stderr: [] };
}

function main(argv: string[]): number {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const result = showRequirements(fs.readFileSync(path.join(repoRoot, SSOT_PATH), 'utf8'), argv);
  for (const line of result.stdout) console.log(line);
  for (const line of result.stderr) console.error(line);
  return result.code;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
