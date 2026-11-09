import type { Role } from '../../../../access/domain/Role.ts';

export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ANY';

export type RouteContext = {
  readonly request: Request;
  readonly url: URL;
  readonly role: Role;
  /** The parsed JSON object of a POST (empty object for other methods). */
  readonly body: Record<string, unknown>;
  /** Capture groups of a RegExp pattern, in order. */
  readonly params: readonly string[];
};

/** `pattern` is an exact path (string) or a RegExp tested against the whole path. `isPublic` routes skip authentication. */
export type RouteDefinition = {
  readonly method: RouteMethod;
  readonly pattern: string | RegExp;
  readonly isPublic?: true;
  readonly handler: (context: RouteContext) => Response | Promise<Response>;
};

export type RouteMatch = { readonly route: RouteDefinition; readonly params: readonly string[] };

export function findRoute(routes: readonly RouteDefinition[], method: string, path: string, publicOnly: boolean): RouteMatch | null {
  for (const route of routes) {
    if (publicOnly && route.isPublic !== true) continue;
    if (route.method !== 'ANY' && route.method !== method) continue;
    if (typeof route.pattern === 'string') {
      if (route.pattern === path) return { route, params: [] };
      continue;
    }
    const match = route.pattern.exec(path);
    if (match !== null && match[0] === path) return { route, params: match.slice(1) };
  }
  return null;
}
