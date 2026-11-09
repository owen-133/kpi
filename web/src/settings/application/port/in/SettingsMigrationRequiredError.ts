/** The database has no `orbit_settings` function yet (supabase/settings.sql was not run). */
export class SettingsMigrationRequiredError extends Error {
  constructor() {
    super('관리자 설정 DB 초기화가 필요합니다. supabase/settings.sql을 SQL Editor에서 실행하세요.');
    this.name = 'SettingsMigrationRequiredError';
  }
}
