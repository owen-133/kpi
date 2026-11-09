// The legacy request guard (server.js:24-29), in the legacy order:
//   /health (public) -> 401 Basic -> [api] viewer 403 on non-GET -> cross-origin 403 on writes -> body cap 413 / 400
//   -> route -> 404 -> [non-api] 405 on non-GET, 404 page -> any thrown error = generic 503.
// `screen` answers health, 401 and the non-API 405 (null = let Next serve the page) and is what src/proxy.ts calls for every
// request, so pages and static files are guarded as the legacy portal guards them. `handle` runs the whole chain
// and is what the catch-all API route calls (it authenticates again: the route must not trust the proxy alone).
import type { AuthorizeRequestUseCase } from '../../../application/port/in/AuthorizeRequestUseCase.ts';
import type { Role } from '../../../domain/Role.ts';
import { HttpError, jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import { findRoute } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import { credentialsFromHeader } from './basicAuthHeader.ts';

import { BODY_LIMIT_BYTES, BODY_LIMIT_CHARACTERS } from './bodyLimit.ts';

export { BODY_LIMIT_CHARACTERS };
const GENERIC_ERROR = '데이터 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export type GuardPipelineDependencies = {
  readonly authorize: AuthorizeRequestUseCase;
  readonly routes: readonly RouteDefinition[];
  /** Receives one line per failure: route, status and error name only. */
  readonly log: (line: string) => void;
};

export type GuardPipeline = {
  screen(request: Request): Promise<Response | null>;
  handle(request: Request): Promise<Response>;
};

function unauthorized(): Response {
  // No Content-Type, like the legacy writeHead: the body is raw bytes, not a string, so Response adds none.
  return new Response(new TextEncoder().encode('로그인이 필요합니다.'), {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Orbit Ops", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });
}

function isCrossOriginWrite(request: Request, url: URL): boolean {
  if (request.method === 'GET') return false;
  const origin = request.headers.get('origin');
  if (origin === null || origin === '') return false;
  const host = request.headers.get('host') ?? url.host;
  return origin !== `http://${host}` && origin !== `https://${host}`;
}

/** The Content-Length header as a number, 0 when absent or not a number (a chunked body has none). */
function declaredLength(request: Request): number {
  const value = Number(request.headers.get('content-length') ?? '0');
  return Number.isFinite(value) ? value : 0;
}

type BodyResult = { readonly kind: 'object'; readonly value: Record<string, unknown> } | { readonly kind: 'too-long' } | { readonly kind: 'invalid' };

/** Reads the body as a stream with a streaming decoder and stops as soon as the character cap is exceeded. */
async function readJsonObject(request: Request): Promise<BodyResult> {
  let text = '';
  if (request.body !== null) {
    const reader = request.body.getReader();
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length > BODY_LIMIT_CHARACTERS) {
        await reader.cancel();
        return { kind: 'too-long' };
      }
    }
    text += decoder.decode();
    if (text.length > BODY_LIMIT_CHARACTERS) return { kind: 'too-long' };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'invalid' };
    return { kind: 'object', value: parsed as Record<string, unknown> };
  } catch {
    return { kind: 'invalid' };
  }
}

export function createGuardPipeline(dependencies: GuardPipelineDependencies): GuardPipeline {
  const { authorize, routes, log } = dependencies;

  const roleOf = (request: Request): Role | null => authorize.authorize(credentialsFromHeader(request.headers.get('authorization')));

  async function screen(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    // Public routes (/health) have no page behind them: they are answered here, in full.
    if (findRoute(routes, request.method, url.pathname, true) !== null) return handle(request);
    if (roleOf(request) === null) return unauthorized();
    if (!url.pathname.startsWith('/api/') && request.method !== 'GET') return jsonResponse(405, { error: '지원하지 않는 요청입니다.' });
    // A declared size over the byte limit is answered by `handle`, which keeps the legacy order (403 before 413)
    // and answers 413 without reading the body.
    if (request.method === 'POST' && declaredLength(request) > BODY_LIMIT_BYTES) return handle(request);
    return null;
  }

  async function handle(request: Request): Promise<Response> {
    let matchedRoute = 'unmatched';
    try {
      const url = new URL(request.url);
      const publicMatch = findRoute(routes, request.method, url.pathname, true);
      if (publicMatch !== null) {
        matchedRoute = String(publicMatch.route.pattern);
        return await publicMatch.route.handler({ request, url, role: 'viewer', body: {}, params: publicMatch.params });
      }
      const role = roleOf(request);
      if (role === null) return unauthorized();
      if (!url.pathname.startsWith('/api/')) {
        if (request.method !== 'GET') return jsonResponse(405, { error: '지원하지 않는 요청입니다.' });
        return jsonResponse(404, { error: '페이지를 찾을 수 없습니다.' });
      }
      if (request.method !== 'GET' && role !== 'admin') return jsonResponse(403, { error: '조회 계정은 업무를 변경할 수 없습니다.' });
      if (isCrossOriginWrite(request, url)) return jsonResponse(403, { error: '허용되지 않은 요청입니다.' });
      let body: Record<string, unknown> = {};
      if (request.method === 'POST') {
        if (declaredLength(request) > BODY_LIMIT_BYTES) return jsonResponse(413, { error: '입력 내용이 너무 깁니다.' });
        const result = await readJsonObject(request);
        if (result.kind === 'too-long') return jsonResponse(413, { error: '입력 내용이 너무 깁니다.' });
        if (result.kind === 'invalid') return jsonResponse(400, { error: '잘못된 입력입니다.' });
        body = result.value;
      }
      const match = findRoute(routes, request.method, url.pathname, false);
      if (match === null) return jsonResponse(404, { error: '지원하지 않는 요청입니다.' });
      matchedRoute = String(match.route.pattern);
      return await match.route.handler({ request, url, role, body, params: match.params });
    } catch (error) {
      if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message });
      // Only the route, the status and the error class name are logged: never bodies, headers or parameters.
      const name = error instanceof Error ? error.name : 'NonError';
      log(`Request failed: route=${matchedRoute} status=503 error=${name}`);
      return jsonResponse(503, { error: GENERIC_ERROR });
    }
  }

  return { screen, handle };
}
