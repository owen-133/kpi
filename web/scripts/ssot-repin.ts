// Repins anchored SSOT evidence after line drift.
//
//   node web/scripts/ssot-repin.ts <requirements.md> [--write]      (run from the repository root)
//
// For every `path:N[-M] ~ <literal>` evidence entry of a planned or current requirement whose literal is not at the
// cited lines, the literal must occur exactly once in that file; the pointer is then moved to that line (a range keeps
// its length and starts at the literal, shifted back when it would run past the end of the file).
// Dry run by default: prints `R-NNN old -> new` per correction. `--write` rewrites the file, and only when every entry
// is resolvable. A literal that occurs 0 or several times elsewhere, a missing file or an empty literal is a problem:
// they go to stderr and the exit code is 1. Entries without `~` are only counted ("unanchored: N").
// Exit codes: 0 done (or nothing to do) · 1 problems · 2 usage.
import fs from 'node:fs';
import path from 'node:path';
import { citedText, findLiteralLines, formatPointer, parseEvidencePointer, parseRequirements } from '../src/ssot.helpers.ts';

export interface Repin {
  id: string;
  from: string; // old pointer, `file:N[-M]`
  to: string; // corrected pointer
  literal: string;
}

export interface RepinPlan {
  text: string; // the requirements text with the corrections applied
  repins: Repin[];
  problems: string[];
  unanchored: number; // evidence entries without an anchor (dropped requirements are not counted)
}

const ANY_HEADING = /^#{1,3}\s/;

export function planRepins(requirementsText: string, root: string): RepinPlan {
  const lines = requirementsText.split('\n');
  const repins: Repin[] = [];
  const problems: string[] = [];
  let unanchored = 0;
  const requirements = parseRequirements(requirementsText);
  for (const req of requirements) {
    if (req.status === 'dropped') continue;
    const blockStart = req.line; // index of the line after the heading
    let blockEnd = blockStart;
    while (blockEnd < lines.length && !ANY_HEADING.test(lines[blockEnd])) blockEnd++;
    for (const entry of new Set(req.evidence)) {
      const pointer = parseEvidencePointer(entry);
      if (pointer === null || pointer.literal === null) {
        if (pointer !== null) unanchored++;
        continue;
      }
      const { file, from, to, literal } = pointer;
      if (literal === '') {
        problems.push(`${req.id} '${entry}' has an anchor with an empty literal`);
        continue;
      }
      const full = path.resolve(root, file);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        problems.push(`${req.id} '${entry}': file '${file}' is missing`);
        continue;
      }
      const text = fs.readFileSync(full, 'utf8');
      if (citedText(text, from, to).includes(literal)) continue;
      const found = findLiteralLines(text, literal);
      if (found.length !== 1) {
        const where = found.length === 0 ? 'not found in the file' : `occurs ${found.length} times (${found.map((line) => `${file}:${line}`).join(', ')}); fix by hand`;
        problems.push(`${req.id} '${entry}': literal '${literal}' ${where}`);
        continue;
      }
      const span = from === null || to === null ? 0 : to - from;
      const total = text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
      const newFrom = Math.max(1, Math.min(found[0], total - span));
      const oldText = formatPointer(file, from, to);
      const newText = formatPointer(file, newFrom, newFrom + span);
      const owners: number[] = [];
      for (let i = blockStart - 1; i < blockEnd; i++) if (lines[i].includes(entry)) owners.push(i);
      if (owners.length === 0) {
        problems.push(`${req.id} '${entry}': no line of the requirement contains this entry as written; fix by hand`);
        continue;
      }
      for (const i of owners) {
        const at = lines[i].indexOf(entry) + entry.indexOf(oldText);
        lines[i] = lines[i].slice(0, at) + newText + lines[i].slice(at + oldText.length);
      }
      repins.push({ id: req.id, from: oldText, to: newText, literal });
    }
  }
  return { text: lines.join('\n'), repins, problems, unanchored };
}

function main(argv: string[]): number {
  const usage = 'usage: node web/scripts/ssot-repin.ts <requirements.md> [--write]';
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const files = argv.filter((arg) => !arg.startsWith('--'));
  if (files.length !== 1 || flags.some((flag) => flag !== '--write')) {
    console.error(usage);
    return 2;
  }
  const requirementsPath = path.resolve(files[0]);
  if (!fs.existsSync(requirementsPath)) {
    console.error(`${usage}\nmissing ${files[0]}`);
    return 2;
  }
  const write = flags.includes('--write');
  const plan = planRepins(fs.readFileSync(requirementsPath, 'utf8'), process.cwd());
  for (const repin of plan.repins) console.log(`${repin.id} ${repin.from} -> ${repin.to}  ~ ${repin.literal}`);
  console.log(`repinned: ${plan.repins.length}`);
  console.log(`unanchored: ${plan.unanchored}`);
  if (plan.problems.length > 0) {
    for (const problem of plan.problems) console.error(`problem: ${problem}`);
    console.error(`${plan.problems.length} problem(s); nothing written`);
    return 1;
  }
  if (write && plan.repins.length > 0) {
    fs.writeFileSync(requirementsPath, plan.text);
    console.log(`wrote ${files[0]}`);
  }
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
