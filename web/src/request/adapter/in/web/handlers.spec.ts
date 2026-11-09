// R-001 R-002 R-004 R-006
// The driving adapter in isolation: stub use cases, handlers called with a route context. Proves the role check the
// handler repeats on its own and the mapping of database failures to HTTP answers.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OrbitFunctionError } from '../../../../shared/port/OrbitFunctions.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';
import { findRoute } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { RouteContext } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { Role } from '../../../../access/domain/Role.ts';
import type { RequestUseCases } from '../../../application/port/in/RequestUseCases.ts';
import { requestRoutes } from './routes.ts';

const ID = '0b0f6c1e-1111-4222-8333-444455556666';
const refuse = (error: unknown): RequestUseCases => {
  const fail = async () => {
    throw error;
  };
  return { listTasks: { list: fail }, getTaskDetail: { detail: fail }, registerTask: { register: fail }, changeTaskStatus: { change: fail }, addTaskNote: { add: fail } };
};
const NEW = { title: 't', requester: 'r', requested_at: '2026-11-03T01:00:00Z' };

async function run(useCases: RequestUseCases, method: string, path: string, body: Record<string, unknown>, role: Role): Promise<Response> {
  const match = findRoute(requestRoutes(useCases), method, path, false);
  assert.notEqual(match, null, `${method} ${path} must be a request route`);
  const context: RouteContext = { request: new Request('http://portal.test' + path, { method }), url: new URL('http://portal.test' + path), role, body, params: match!.params };
  return match!.route.handler(context);
}

describe('write routes check the role themselves', () => {
  const writes: Array<[string, string, Record<string, unknown>]> = [
    ['POST', '/api/tasks', NEW],
    ['POST', `/api/tasks/${ID}/status`, { status: '완료' }],
    ['POST', `/api/tasks/${ID}/notes`, { note: 'x' }],
  ];
  for (const [method, path, body] of writes) {
    it(`${method} ${path} refuses a viewer with 403 before touching any use case`, async () => {
      await assert.rejects(run(refuse(new Error('must not be called')), method, path, body, 'viewer'), (e) => e instanceof HttpError && e.status === 403 && e.message === '조회 계정은 업무를 변경할 수 없습니다.');
    });
  }
});

describe('database failures become the answers the legacy portal gave', () => {
  const cases: Array<[string, string | undefined, number | 'unmapped']> = [
    ['식별자 또는 시각 형식을 확인하세요.', 'PT400', 400],
    ['업무를 찾을 수 없습니다.', 'PT404', 404],
    ['다른 화면에서 수정됐습니다.', 'PT409', 409],
    ['invalid input syntax for type uuid', '22P02', 'unmapped'],
    ['function public.orbit_api(unknown, jsonb) does not exist', '42883', 'unmapped'],
    ['connection terminated', undefined, 'unmapped'],
  ];
  for (const [message, code, expected] of cases) {
    it(`code ${code ?? 'none'} -> ${expected}`, async () => {
      const error = new OrbitFunctionError(message, code);
      const outcome = run(refuse(error), 'POST', `/api/tasks/${ID}/notes`, { note: 'x' }, 'admin');
      if (expected === 'unmapped') {
        // not an HttpError: the pipeline answers its generic 503 and logs only the error name
        await assert.rejects(outcome, (e) => !(e instanceof HttpError) && e === error);
      } else {
        await assert.rejects(outcome, (e) => e instanceof HttpError && e.status === expected && e.message === message);
      }
    });
  }

  it('the same mapping applies to every route', async () => {
    const error = new OrbitFunctionError('업무를 찾을 수 없습니다.', 'PT404');
    for (const [method, path, body] of [['GET', '/api/tasks', {}], ['GET', `/api/tasks/${ID}`, {}], ['POST', '/api/tasks', NEW], ['POST', `/api/tasks/${ID}/status`, { status: '완료' }]] as const) {
      await assert.rejects(run(refuse(error), method, path, { ...body }, 'admin'), (e) => e instanceof HttpError && e.status === 404, `${method} ${path}`);
    }
  });
});
