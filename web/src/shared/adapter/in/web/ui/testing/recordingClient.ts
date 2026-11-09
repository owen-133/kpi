import type { ApiClient } from '../apiClient.ts';

export type RecordedRequest = { readonly path: string; readonly body: unknown; readonly hasBody: boolean };

/** An ApiClient that answers every call with `answer(path)` and remembers what was asked. Used to test the `create<Ctx>Api` factories. */
export function recordingClient(answer: (path: string) => unknown = () => ({})): ApiClient & { readonly requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    async request<T>(path: string, body?: unknown): Promise<T> {
      requests.push({ path, body, hasBody: body !== undefined });
      return answer(path) as T;
    },
  };
}
