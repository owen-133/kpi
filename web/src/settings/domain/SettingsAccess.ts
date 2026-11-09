// Who may change settings and read their history. The portal has two kinds of caller.
export type SettingsActor = 'admin' | 'viewer';

export class SettingsAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsAccessDeniedError';
  }
}

export function assertCanChangeSettings(actor: SettingsActor): void {
  if (actor !== 'admin') throw new SettingsAccessDeniedError('조회 계정은 업무를 변경할 수 없습니다.');
}

export function assertCanReadSettingsHistory(actor: SettingsActor): void {
  if (actor !== 'admin') throw new SettingsAccessDeniedError('관리자만 설정 이력을 볼 수 있습니다.');
}
