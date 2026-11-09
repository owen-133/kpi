export class StaleFingerprintError extends Error {
  constructor() {
    super('집계 후 업무가 변경됐습니다. 새로 집계하고 발행하세요.');
    this.name = 'StaleFingerprintError';
  }
}
