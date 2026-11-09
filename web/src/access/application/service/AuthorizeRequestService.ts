import type { AccessConfiguration } from '../../domain/AccessConfiguration.ts';
import type { Credentials } from '../../domain/Credentials.ts';
import type { Role } from '../../domain/Role.ts';
import type { AuthorizeRequestUseCase, SessionView } from '../port/in/AuthorizeRequestUseCase.ts';
import type { SecretComparator } from '../port/out/SecretComparator.ts';

export class AuthorizeRequestService implements AuthorizeRequestUseCase {
  private readonly configuration: AccessConfiguration;
  private readonly comparator: SecretComparator;

  constructor(configuration: AccessConfiguration, comparator: SecretComparator) {
    this.configuration = configuration;
    this.comparator = comparator;
  }

  authorize(credentials: Credentials | null): Role | null {
    if (this.configuration.openMode) return this.configuration.openModeRole;
    if (credentials === null) return null;
    const { adminPassword, viewerPassword } = this.configuration;
    // Both roles are always evaluated so the time taken does not reveal which user name matched.
    const adminMatches = this.comparator.equal(credentials.password, adminPassword ?? '');
    const viewerMatches = this.comparator.equal(credentials.password, viewerPassword ?? '');
    if (credentials.user === 'admin' && adminMatches) return 'admin';
    if (credentials.user === 'viewer' && viewerPassword !== undefined && viewerMatches) return 'viewer';
    return null;
  }

  describeSession(role: Role): SessionView {
    return { role, shared: this.configuration.shared };
  }
}
