import type { Credentials } from '../../../domain/Credentials.ts';

/**
 * Credentials of an `Authorization: Basic …` header, or null. Like the legacy portal the scheme is matched
 * case-sensitively. Unlike the legacy portal a decoded value without ':' is refused (legacy split it at index -1).
 */
export function credentialsFromHeader(header: string | null): Credentials | null {
  if (header === null || !header.startsWith('Basic ')) return null;
  const pair = Buffer.from(header.slice(6), 'base64').toString();
  const separator = pair.indexOf(':');
  if (separator === -1) return null;
  return { user: pair.slice(0, separator), password: pair.slice(separator + 1) };
}
