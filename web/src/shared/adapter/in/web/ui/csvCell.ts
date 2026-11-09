// The one CSV cell of the portal's task and improvement-ledger exports: quoted, quotes doubled, and a cell that starts
// with = + @ or - (after any whitespace, including CR LF and unicode spaces) gets an apostrophe in front so a spreadsheet
// reads it as text, not as a formula. The metrics CSV is not built from it: its values are system numbers and dates.
export function csvCell(value: unknown): string {
  return '"' + String(value ?? '').replace(/^\s*[=+@-]/, "'$&").replaceAll('"', '""') + '"';
}
