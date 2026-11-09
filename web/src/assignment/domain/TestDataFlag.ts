export const TEST_DATA_FLAG_MESSAGE = '데이터 구분을 확인하세요.';

export class InvalidTestDataFlagError extends Error {
  constructor() {
    super(TEST_DATA_FLAG_MESSAGE);
    this.name = 'InvalidTestDataFlagError';
  }
}

/** Whether a task is test data. Only a real boolean is a flag: the strings 'true' / 'false', numbers and null are not. */
export function parseTestDataFlag(raw: unknown): boolean {
  if (typeof raw !== 'boolean') throw new InvalidTestDataFlagError();
  return raw;
}
