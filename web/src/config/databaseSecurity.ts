// TLS policy for the production database connection. Pure functions so they can be tested without a server.
export type TlsOptions = { rejectUnauthorized: true; ca?: string };

const PLAINTEXT_SSLMODES = new Set(['disable', 'allow', 'prefer', 'no-verify']);
const FALSE_VALUES = new Set(['false', '0', 'off', 'no']);

/** The TLS options for the client, or a throw when the URL would let the password travel without verified TLS. */
export function tlsOptionsFor(databaseUrl: string | undefined, certificateAuthority: string | undefined): TlsOptions {
  if (databaseUrl === undefined || databaseUrl.trim() === '') throw new Error('DATABASE_URL is required');
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error('DATABASE_URL must be a postgres:// URL');
  const sslmode = url.searchParams.get('sslmode')?.toLowerCase();
  const ssl = url.searchParams.get('ssl')?.toLowerCase();
  if ((sslmode !== undefined && PLAINTEXT_SSLMODES.has(sslmode)) || (ssl !== undefined && FALSE_VALUES.has(ssl))) {
    throw new Error('DATABASE_URL disables TLS verification: refusing to send the password in plaintext');
  }
  return certificateAuthority === undefined || certificateAuthority === ''
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: true, ca: certificateAuthority };
}
