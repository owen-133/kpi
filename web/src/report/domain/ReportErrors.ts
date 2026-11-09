// Rule violations of the report context. The messages are the legacy responses, word for word.
export class InvalidMonthError extends Error {
  constructor() {
    super('조회 월을 확인하세요.');
    this.name = 'InvalidMonthError';
  }
}

export class FutureMonthError extends Error {
  constructor() {
    super('미래 월 리포트는 발행할 수 없습니다.');
    this.name = 'FutureMonthError';
  }
}

export class DraftTooLongError extends Error {
  constructor() {
    super('보고서는 20000자 이하로 입력하세요.');
    this.name = 'DraftTooLongError';
  }
}
