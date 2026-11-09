// Read model of one task as the board sees it. Field names follow the task payload of the server,
// so the web adapter can pass the payload through without renaming.
// Dates are ISO instants except due_date, which is a 'YYYY-MM-DD' day.
export interface BoardTask {
  readonly id: string;
  readonly title: string;
  readonly requester?: string | null;
  readonly department?: string | null;
  readonly channel?: string | null;
  readonly category?: string | null;
  readonly priority?: string | null;
  readonly description?: string | null;
  readonly assignee?: string | null;
  readonly status?: string | null;
  readonly due_date?: string | null;
  readonly requested_at?: string | null;
  readonly completed_at?: string | null;
  readonly created_at?: string | null;
  readonly is_test?: boolean | null;
}
