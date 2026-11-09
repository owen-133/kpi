import type { Credentials } from '../../../domain/Credentials.ts';
import type { Role } from '../../../domain/Role.ts';

export type SessionView = { readonly role: Role; readonly shared: boolean };

export interface AuthorizeRequestUseCase {
  /** The role of the caller, or null when the credentials are missing or wrong. */
  authorize(credentials: Credentials | null): Role | null;
  describeSession(role: Role): SessionView;
}
