// The content of one improvement-ledger entry (R-025) and its rules. The messages are the legacy responses.
export const IMPROVEMENT_FIELD_LIMIT = 5000;
export const IMPROVEMENT_STAGES = ['MVP 구축', '본인 실사용', '정착 운영'] as const;
export const IMPROVEMENT_STATUSES = ['접수', '개선 중', '검증 완료'] as const;
const FIELDS = ['title', 'stage', 'source', 'feedback', 'action', 'result', 'status'] as const;

export type ImprovementValue = Readonly<Record<(typeof FIELDS)[number], string>>;

export class InvalidImprovementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImprovementError';
  }
}

const read = (value: unknown, key: string): unknown =>
  value === null || value === undefined ? undefined : (value as Record<string, unknown>)[key];

/**
 * Trims and checks the seven text fields. Other keys are dropped. A missing, null or non-object value reads as empty
 * fields. Each field's 5000-character limit is checked, in field order, before the required/enum/result rules.
 */
export function validateImprovement(value: unknown): ImprovementValue {
  const v: Record<string, string> = {};
  for (const key of FIELDS) {
    v[key] = String(read(value, key) || '').trim();
    if (v[key].length > IMPROVEMENT_FIELD_LIMIT) throw new InvalidImprovementError('개선 내용은 항목별 5000자 이하로 입력하세요.');
  }
  if (!v.title || !v.feedback) throw new InvalidImprovementError('개선 제목과 피드백을 입력하세요.');
  if (!(IMPROVEMENT_STAGES as readonly string[]).includes(v.stage) || !(IMPROVEMENT_STATUSES as readonly string[]).includes(v.status)) {
    throw new InvalidImprovementError('단계와 상태를 확인하세요.');
  }
  if (v.status === '검증 완료' && !v.result) throw new InvalidImprovementError('검증 완료에는 검증 결과가 필요합니다.');
  return v as ImprovementValue;
}

/** Saving over an existing entry needs the revision read earlier: a whole number from 1. */
export function assertEditableRevision(revision: unknown): void {
  if (!Number.isInteger(revision) || (revision as number) < 1) throw new InvalidImprovementError('개선 항목 버전을 확인하세요.');
}
