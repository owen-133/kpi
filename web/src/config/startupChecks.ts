// Startup refusals of the legacy portal (server.js:5-12), adapted to this app.
// The legacy `STORAGE_BACKEND=supabase` ("cloud storage") maps to `DATABASE_URL` being set here:
//  - production or a cloud database without both ADMIN_PASSWORD and VIEWER_PASSWORD -> refuse (legacy message)
//  - equal passwords -> refuse (legacy message)
//  - production without DATABASE_URL -> refuse (legacy: "production needs STORAGE_BACKEND=supabase"; there is no
//    local file store in this app, so the message names DATABASE_URL instead)
//  - production DATABASE_URL that cannot be verified over TLS (databaseSecurity.ts) -> refuse at startup, not at the
//    first query; the cause is the policy's own message, which never contains the URL
import { tlsOptionsFor } from './databaseSecurity.ts';

export type Environment = Readonly<Record<string, string | undefined>>;

export function startupProblems(env: Environment): string[] {
  const production = env.NODE_ENV === 'production';
  const cloud = !!env.DATABASE_URL;
  const problems: string[] = [];
  if ((production || cloud) && (!env.ADMIN_PASSWORD || !env.VIEWER_PASSWORD)) {
    problems.push('배포 시 관리자와 조회 비밀번호가 필요합니다.');
  }
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD === env.VIEWER_PASSWORD) {
    problems.push('관리자와 조회 비밀번호는 달라야 합니다.');
  }
  if (production && !cloud) problems.push('운영 배포에는 DATABASE_URL이 필요합니다.');
  if (production && cloud) {
    try {
      tlsOptionsFor(env.DATABASE_URL, env.DATABASE_CA);
    } catch (error) {
      problems.push(`운영 DB 연결은 검증된 TLS가 필요합니다: ${error instanceof Error ? error.message : 'DATABASE_URL을 확인하세요.'}`);
    }
  }
  return problems;
}

export function assertStartupAllowed(env: Environment): void {
  const [first] = startupProblems(env);
  if (first !== undefined) throw new Error(first);
}
