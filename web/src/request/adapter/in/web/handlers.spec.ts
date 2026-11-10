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
  return {
    updateChecklist: { execute: fail },
    listTasks: { list: fail },
    getTaskDetail: { detail: fail },
    registerTask: { register: fail },
    changeTaskStatus: { change: fail },
    addTaskNote: { add: fail },
    editTask: { edit: fail },
    changeTaskLifecycle: { change: fail },
    listTrash: { list: fail },
    listLifecycleHistory: { list: fail },
  };
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
    ['POST', `/api/tasks/${ID}/edit`, { values: {}, revision: 0, reason: 'x' }],
    ['POST', `/api/tasks/${ID}/delete`, { reason: 'x' }],
    ['POST', `/api/tasks/${ID}/restore`, { reason: 'x' }],
    ['POST', `/api/tasks/${ID}/purge`, { reason: 'x', confirmation: 'x' }],
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

describe('the trash and the deletion history are for administrators only', () => {
  for (const path of ['/api/trash', '/api/lifecycle-history']) {
    it(`GET ${path} refuses a viewer with the legacy 403 message before touching any use case`, async () => {
      await assert.rejects(run(refuse(new Error('must not be called')), 'GET', path, {}, 'viewer'), (e) => e instanceof HttpError && e.status === 403 && e.message === '관리자만 휴지통과 삭제 이력을 볼 수 있습니다.');
    });
    it(`GET ${path} lets an administrator through to the use case`, async () => {
      const marker = new Error('reached the use case');
      await assert.rejects(run(refuse(marker), 'GET', path, {}, 'admin'), (e) => e === marker);
    });
  }
  it('only GET is routed: POST /api/trash is not a request route', () => {
    assert.equal(findRoute(requestRoutes(refuse(new Error('x'))), 'POST', '/api/trash', false), null);
    assert.equal(findRoute(requestRoutes(refuse(new Error('x'))), 'GET', `/api/tasks/${ID}/edit`, false), null);
  });
});

describe('edit, delete, restore and purge validate the body before calling a use case', () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    [`/api/tasks/${ID}/edit`, { reason: 'x', revision: 0 }, '수정 항목을 확인하세요.'],
    [`/api/tasks/${ID}/edit`, { values: { title: '', requester: 'r', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description: '' }, reason: 'x', revision: 0 }, '업무명·요청자·요청 시각·기한을 확인하세요.'],
    [`/api/tasks/${ID}/edit`, { values: { title: 't', requester: 'r', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description: '' }, reason: '', revision: 0 }, '수정 사유와 버전을 확인하세요.'],
    [`/api/tasks/${ID}/delete`, {}, '사유를 1~1000자로 입력하세요.'],
    [`/api/tasks/${ID}/restore`, { reason: ' ' }, '사유를 1~1000자로 입력하세요.'],
    [`/api/tasks/${ID}/purge`, { reason: 'a'.repeat(1001) }, '사유를 1~1000자로 입력하세요.'],
  ];
  for (const [path, body, expected] of cases) {
    it(`POST ${path.replace(ID, ':id')} ${JSON.stringify(body).slice(0, 30)} -> 400 ${expected}`, async () => {
      await assert.rejects(run(refuse(new Error('must not be called')), 'POST', path, body, 'admin'), (e) => e instanceof HttpError && e.status === 400 && e.message === expected);
    });
  }
});

describe('edit failures follow the legacy edit mapping (store.edit), not the shared one', () => {
  const cases: Array<[string, string | undefined, number, string]> = [
    ['식별자 또는 시각을 확인하세요.', 'PT400', 400, '식별자 또는 시각을 확인하세요.'],
    ['업무를 찾을 수 없습니다.', 'PT404', 404, '업무를 찾을 수 없습니다.'],
    ['휴지통의 업무는 복원 후 수정하세요.', 'PT409', 409, '휴지통의 업무는 복원 후 수정하세요.'],
    ['function public.orbit_edit_task(jsonb) does not exist', '42883', 503, '업무 수정 기능 DB 초기화가 필요합니다. supabase/edit.sql을 SQL Editor에서 실행하세요.'],
    ['invalid input syntax for type uuid', '22P02', 503, '업무 수정 저장에 실패했습니다.'],
    ['connection terminated', undefined, 503, '업무 수정 저장에 실패했습니다.'],
  ];
  const body = { values: { title: 't', requester: 'r', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description: '' }, revision: 0, reason: 'x' };
  for (const [message, code, status, expected] of cases) {
    it(`code ${code ?? 'none'} -> ${status} ${expected.slice(0, 20)}`, async () => {
      await assert.rejects(run(refuse(new OrbitFunctionError(message, code)), 'POST', `/api/tasks/${ID}/edit`, body, 'admin'), (e) => e instanceof HttpError && e.status === status && e.message === expected);
    });
  }
  it('an error that is not a database failure is rethrown untouched (the pipeline answers its generic 503)', async () => {
    const error = new TypeError('boom');
    await assert.rejects(run(refuse(error), 'POST', `/api/tasks/${ID}/edit`, body, 'admin'), (e) => e === error);
  });
});

describe('lifecycle failures follow the legacy rpc mapping with the deletion-install message', () => {
  const cases: Array<[string, string | undefined, number | 'unmapped', string]> = [
    ['사유를 1~1000자로 입력하세요.', 'PT400', 400, '사유를 1~1000자로 입력하세요.'],
    ['업무를 찾을 수 없습니다.', 'PT404', 404, '업무를 찾을 수 없습니다.'],
    ['이미 휴지통에 있는 업무입니다.', 'PT409', 409, '이미 휴지통에 있는 업무입니다.'],
    ['function public.orbit_lifecycle(unknown, jsonb) does not exist', '42883', 503, '삭제 기능 DB 초기화가 필요합니다. supabase/deletion.sql을 SQL Editor에서 실행하세요.'],
    ['invalid input syntax for type uuid', '22P02', 'unmapped', ''],
    ['connection terminated', undefined, 'unmapped', ''],
  ];
  const routes: Array<[string, string, Record<string, unknown>]> = [
    ['POST', `/api/tasks/${ID}/delete`, { reason: 'x' }],
    ['POST', `/api/tasks/${ID}/purge`, { reason: 'x', confirmation: 'y' }],
    ['GET', '/api/trash', {}],
    ['GET', '/api/lifecycle-history', {}],
  ];
  for (const [message, code, status, expected] of cases) {
    it(`code ${code ?? 'none'} -> ${status}`, async () => {
      for (const [method, path, body] of routes) {
        const error = new OrbitFunctionError(message, code);
        const outcome = run(refuse(error), method, path, body, 'admin');
        if (status === 'unmapped') await assert.rejects(outcome, (e) => !(e instanceof HttpError) && e === error, path);
        else await assert.rejects(outcome, (e) => e instanceof HttpError && e.status === status && e.message === expected, path);
      }
    });
  }
});
