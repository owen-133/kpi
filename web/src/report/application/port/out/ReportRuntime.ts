// What the report use cases need from the machine they run on: the current instant and a SHA-256 digest.
export interface ReportRuntime {
  /** The current instant as an ISO string (e.g. 2026-11-09T01:02:03.456Z). */
  nowIso(): string;
  /** Lower-case hex SHA-256 of the UTF-8 text. */
  sha256Hex(text: string): string;
}
