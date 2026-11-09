/** Why the database refused a task command: its own rule (invalid), no such task (not-found) or a version clash (conflict). */
export type RejectionReason = 'invalid' | 'not-found' | 'conflict';

/** A refusal whose message is meant for the person using the portal (the database raise-exception text). */
export class TaskRejectedError extends Error {
  readonly reason: RejectionReason;

  constructor(reason: RejectionReason, message: string) {
    super(message);
    this.name = 'TaskRejectedError';
    this.reason = reason;
  }
}

export const KPI_MIGRATION_MESSAGE = 'KPI 기능 DB 초기화가 필요합니다. supabase/kpi.sql을 SQL Editor에서 실행하세요.';

/** The orbit_kpi function is not installed in the database. */
export class KpiMigrationRequiredError extends Error {
  constructor() {
    super(KPI_MIGRATION_MESSAGE);
    this.name = 'KpiMigrationRequiredError';
  }
}
