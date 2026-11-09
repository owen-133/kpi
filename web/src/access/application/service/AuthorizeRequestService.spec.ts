import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AccessConfiguration } from '../../domain/AccessConfiguration.ts';
import { AuthorizeRequestService } from './AuthorizeRequestService.ts';
import type { SecretComparator } from '../port/out/SecretComparator.ts';

class CountingComparator implements SecretComparator {
  comparisons = 0;
  equal(given: string, expected: string): boolean {
    this.comparisons += 1;
    return given === expected;
  }
}

function serviceWith(adminPassword: string | undefined, viewerPassword: string | undefined, production = false) {
  const comparator = new CountingComparator();
  const configuration = AccessConfiguration.create({ adminPassword, viewerPassword, production });
  return { comparator, service: new AuthorizeRequestService(configuration, comparator) };
}

describe('AuthorizeRequestService', () => {
  it('grants admin in open mode (no passwords, not production) even without credentials', () => {
    const { service } = serviceWith(undefined, undefined);
    assert.equal(service.authorize(null), 'admin');
  });

  it('refuses everything without credentials when an admin password is configured', () => {
    const { service } = serviceWith('a-secret', 'v-secret');
    assert.equal(service.authorize(null), null);
  });

  it('maps admin and viewer credentials to their roles', () => {
    const { service } = serviceWith('a-secret', 'v-secret');
    assert.equal(service.authorize({ user: 'admin', password: 'a-secret' }), 'admin');
    assert.equal(service.authorize({ user: 'viewer', password: 'v-secret' }), 'viewer');
  });

  it('rejects a wrong password, an unknown user and a swapped user/password pair', () => {
    const { service } = serviceWith('a-secret', 'v-secret');
    assert.equal(service.authorize({ user: 'admin', password: 'nope' }), null);
    assert.equal(service.authorize({ user: 'other', password: 'a-secret' }), null);
    assert.equal(service.authorize({ user: 'viewer', password: 'a-secret' }), null);
    assert.equal(service.authorize({ user: 'admin', password: 'v-secret' }), null);
  });

  it('never lets the viewer user in when no viewer password is configured (empty password included)', () => {
    const { service } = serviceWith('a-secret', undefined);
    assert.equal(service.authorize({ user: 'viewer', password: '' }), null);
  });

  it('always evaluates both roles, whichever one matches', () => {
    const { service, comparator } = serviceWith('a-secret', 'v-secret');
    service.authorize({ user: 'admin', password: 'a-secret' });
    assert.equal(comparator.comparisons, 2);
    service.authorize({ user: 'viewer', password: 'v-secret' });
    assert.equal(comparator.comparisons, 4);
    service.authorize({ user: 'x', password: 'y' });
    assert.equal(comparator.comparisons, 6);
  });

  it('describes the session like the legacy portal: role plus whether passwords are shared', () => {
    assert.deepEqual(serviceWith(undefined, undefined).service.describeSession('admin'), { role: 'admin', shared: false });
    assert.deepEqual(serviceWith('a', 'b').service.describeSession('viewer'), { role: 'viewer', shared: true });
  });

  it('refuses a configuration without both passwords in production, with equal passwords, or with equal ones anywhere', () => {
    assert.throws(() => AccessConfiguration.create({ adminPassword: 'a', viewerPassword: undefined, production: true }), /배포 시 관리자와 조회 비밀번호가 필요합니다\./);
    assert.throws(() => AccessConfiguration.create({ adminPassword: undefined, viewerPassword: undefined, production: true }), /배포 시 관리자와 조회 비밀번호가 필요합니다\./);
    assert.throws(() => AccessConfiguration.create({ adminPassword: 'same', viewerPassword: 'same', production: false }), /관리자와 조회 비밀번호는 달라야 합니다\./);
  });
});
