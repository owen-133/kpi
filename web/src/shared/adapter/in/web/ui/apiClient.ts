// Browser-side JSON helper of the portal. It reproduces the legacy `api()` of public/app.js exactly:
// a call is a POST only when a truthy body is given, a 401 reloads the page, and the server's own error text is thrown.
export type ApiClient = { request<T>(path: string, body?: unknown): Promise<T> };

export const LOGIN_REQUIRED_MESSAGE = '로그인이 필요합니다.';
export const REQUEST_FAILED_MESSAGE = '요청에 실패했습니다.';

export function createApiClient(deps: { fetch: typeof fetch; reload: () => void }): ApiClient {
  return {
    async request<T>(path: string, body?: unknown): Promise<T> {
      const init: RequestInit = body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {};
      const response = await deps.fetch('/api/' + path, init);
      if (response.status === 401) {
        deps.reload();
        throw new Error(LOGIN_REQUIRED_MESSAGE);
      }
      // Like the legacy helper the body is always read as JSON: a non-JSON answer rejects with the parser's own error.
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || REQUEST_FAILED_MESSAGE);
      return data as T;
    },
  };
}
