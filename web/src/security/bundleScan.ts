// Finds secret names and values in build output. Client chunks must hold neither the names nor the values of the
// server-only environment variables; the server output may name them (it reads them) but must never hold a value.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export type Finding = { readonly file: string; readonly needle: string };

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

/** Every (file, needle) pair where a text-like file under `directory` contains the needle. */
export function scanDirectory(directory: string, needles: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of filesUnder(directory)) {
    if (!/\.(js|mjs|cjs|json|html|css|map|txt|rsc|body|meta)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const needle of needles) if (text.includes(needle)) findings.push({ file: path.relative(directory, file), needle });
  }
  return findings;
}
