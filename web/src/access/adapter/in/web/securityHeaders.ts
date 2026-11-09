// Security headers added to every response by src/proxy.ts (also the 401/403/404/413/503 answers of the guard).
export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function contentSecurityPolicy(nonce: string, development: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function applySecurityHeaders(headers: Headers, nonce: string, development: boolean): void {
  headers.set('Content-Security-Policy', contentSecurityPolicy(nonce, development));
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Cache-Control', 'no-store');
}
