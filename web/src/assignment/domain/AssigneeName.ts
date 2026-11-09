export const ASSIGNEE_MAX_LENGTH = 100;
export const ASSIGNEE_RANGE_MESSAGE = '담당자를 1~100자로 입력하세요.';

export class InvalidAssigneeError extends Error {
  constructor() {
    super(ASSIGNEE_RANGE_MESSAGE);
    this.name = 'InvalidAssigneeError';
  }
}

/**
 * The name of the person a task is assigned to. The rule is the legacy one: any falsy input counts as empty, anything
 * else is turned into text, trimmed, and must be 1..100 UTF-16 units long (so 50 emoji fit and 51 do not).
 */
export class AssigneeName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(raw: unknown): AssigneeName {
    const text = String(raw || '').trim();
    if (text === '' || text.length > ASSIGNEE_MAX_LENGTH) throw new InvalidAssigneeError();
    return new AssigneeName(text);
  }
}
