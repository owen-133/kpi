// Runs for EVERY request (no matcher), including _next/static and page paths: the legacy portal answers 401 for
// those too. It authenticates, refuses non-GET page requests (also Server Function calls, which are page POSTs) and
// adds the security headers, with a fresh CSP nonce, to every response, including 401/403/404/413/503.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getContainer } from './config/container.ts';
import { applySecurityHeaders, contentSecurityPolicy, createNonce } from './access/adapter/in/web/securityHeaders.ts';

export async function proxy(request: NextRequest): Promise<Response> {
  const nonce = createNonce();
  const development = process.env.NODE_ENV === 'development';
  const answer = await getContainer().pipeline.screen(request);
  if (answer !== null) {
    applySecurityHeaders(answer.headers, nonce, development);
    return answer;
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy(nonce, development));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response.headers, nonce, development);
  return response;
}
