import type { Role } from './Role.ts';

export type AccessSettings = {
  readonly adminPassword: string | undefined;
  readonly viewerPassword: string | undefined;
  readonly production: boolean;
};

/**
 * Which passwords guard the portal. Empty strings count as "not configured" (legacy server.js reads them as falsy).
 * Open mode (no admin password, not production) makes every caller an admin, as the legacy portal does.
 */
export class AccessConfiguration {
  readonly adminPassword: string | undefined;
  readonly viewerPassword: string | undefined;

  private constructor(adminPassword: string | undefined, viewerPassword: string | undefined) {
    this.adminPassword = adminPassword;
    this.viewerPassword = viewerPassword;
  }

  static create(settings: AccessSettings): AccessConfiguration {
    const adminPassword = settings.adminPassword === '' ? undefined : settings.adminPassword;
    const viewerPassword = settings.viewerPassword === '' ? undefined : settings.viewerPassword;
    if (settings.production && (adminPassword === undefined || viewerPassword === undefined)) {
      throw new Error('배포 시 관리자와 조회 비밀번호가 필요합니다.');
    }
    if (adminPassword !== undefined && adminPassword === viewerPassword) {
      throw new Error('관리자와 조회 비밀번호는 달라야 합니다.');
    }
    return new AccessConfiguration(adminPassword, viewerPassword);
  }

  get openMode(): boolean {
    return this.adminPassword === undefined;
  }

  get shared(): boolean {
    return this.adminPassword !== undefined;
  }

  get openModeRole(): Role {
    return 'admin';
  }
}
