# 요구사항 정본

이 파일은 총무 업무 포털(orbit.ops)의 요구사항을 소유하는 유일한 자리다. 요구사항마다 증거(코드 줄)·골든 기록·테스트 이름·인수 조건을 한 곳에 묶는다. 다른 문서는 이 파일을 가리키기만 하고 요구사항을 다시 적지 않는다. `web/src/ssot.helpers.ts` 가 이 파일의 형식과 증거를 검사한다. 증거 항목은 `파일:줄 ~ 그 줄에 실제로 있는 글자` 로 앵커를 달아 두며, 줄이 밀리면 `node web/scripts/ssot-repin.ts docs/ssot/requirements.md` 가 바뀐 줄을 보이고 `--write` 를 붙이면 고친다. 앵커 형식의 정의는 helpers 머리말이 소유한다. `README.md` 는 제품 설명 문서이고 제목 재서술 검사의 대상이 아니다.

## 변경 절차

1. 새 요구사항은 다음 번호를 달아 `status: planned` 로 추가한다.
2. 요구사항 번호 `R-NNN` 을 이름에 붙인 실패하는 테스트를 먼저 쓴다(red).
3. 코드를 쓴다.
4. 테스트가 통과하는 같은 커밋에서 `status` 를 `current` 로 바꾼다.

규칙은 아래와 같다.

- 번호는 `R-001` 부터 빈틈없이 이어지고 뒤에만 붙인다. 지우거나 다시 쓰지 않는다. 폐기한 요구사항은 `status: dropped` 로 남긴다.
- `layer` 는 셋 중 하나다. `core` 는 총무 업무의 핵심 동작, `supporting` 은 핵심을 받치는 인증·보안·화면·배포 요구, `out` 은 아직 범위 밖인 후속 기능이다.
- `status` 는 `current`(지금 동작하고 증거가 있음), `planned`(아직 없음), `dropped`(하지 않기로 함) 중 하나다.
- `evidence` 는 저장소 기준 상대경로의 `파일:줄` 또는 `파일:시작-끝` 이다.
- `golden` 은 `test/golden/legacy-portal.json` 의 `그룹/라벨` 키다. 글롭(`create-*`)은 쓰지 않고 실제 키를 하나씩 적는다.
- `test-name` 은 `test/` 또는 `web/src` 안 기존 테스트 제목을 글자 그대로 적는다.
- `accept` 는 `Given … / When … / Then …` 한 줄이다.
- 값이 없는 키는 키 줄만 두고 항목을 적지 않는다. `planned` 항목은 증거가 없어도 되고, 근거 문서가 있으면 그 줄을 적는다.

형식 예시는 아래 R-001 이다. 키 줄(`layer:`, `status:`, `evidence:`, `golden:`, `test-name:`, `accept:`) 뒤에 목록 항목은 `- ` 로 시작하는 줄로 적는다.

## 핵심

### R-001 업무 요청 등록
layer: core
status: current
home: web/src/request
evidence:
- web/src/shared/domain/kstDates.ts:16 ~ export function isValidDay(
- web/src/access/adapter/in/web/guardPipeline.ts:14 ~ export const BODY_LIMIT_CHARACTERS = 1_600_000
- web/src/request/domain/TaskLimits.ts:2 ~ export const FIELD_MAX_LENGTH = 10000
- supabase/deletion.sql:23-28 ~ elsif action='create' then
- web/src/request/adapter/in/web/routes.ts:12 ~ handler: handlers.create
- web/src/request/adapter/in/web/handlers.spec.ts:1 ~ // R-001 R-002 R-004 R-006
- web/src/request/adapter/in/web/request.scenario.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/adapter/in/web/request.parity.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/application/service/TaskServices.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/domain/TaskLimits.spec.ts:1 ~ // R-001 R-004
golden:
- secured/create-full
- secured/create-minimal-trimmed
- secured/create-missing-title
- secured/create-missing-requester
- secured/create-bad-requested-at
- secured/create-bad-due-date
- secured/create-too-long-field
- secured/create-too-long-body
- secured/bad-json
- secured/bad-json-array
- secured/bad-json-empty-body
test-name:
- answers the request-route scenarios like the legacy oracle
accept:
- Given 관리자로 로그인한 상태 / When 제목·요청자·요청 시각을 담아 업무를 등록하면 / Then 201 과 새 업무 id 가 돌아오고 상태는 접수다
- Given 관리자로 로그인한 상태 / When 제목이나 요청자가 비었거나 요청 시각이 날짜로 읽히지 않으면 / Then 400 으로 거절한다

등록 입력은 앞뒤 공백을 지우고 항목마다 10000자를 넘으면 400, 요청 본문이 1600000자를 넘으면 413(`guardPipeline.ts` 의 `BODY_LIMIT_CHARACTERS`), JSON 객체가 아니면 400 이다. 기한은 있으면 `YYYY-MM-DD` 형식의 실제 달력 날짜여야 한다. 등록은 변경 이력에 `등록` 한 줄을 남긴다. golden `create-too-long-body` 는 한 항목이 64100자인 본문이라 413 이 아니라 항목 길이 400 을 고정한다. 413 경로는 `web/src/security/guard.security.spec.ts` 가 고정한다. 본문 1600000자는 받고 1600001자는 JSON 을 읽기 전에 413 이며, 조회 계정은 본문을 읽기 전에 403 이다(녹화 `char-tasks/ct-body-viewer`). 한도는 등록뿐 아니라 모든 POST 에 걸린다.

### R-002 업무 상태 전환
layer: core
status: current
home: web/src/request
evidence:
- web/src/request/domain/TaskStatus.ts:3 ~ export const TASK_STATUSES = ['접수', '진행 중', '대기', '완료']
- supabase/schema.sql:9 ~ check(status in
- supabase/deletion.sql:40-46 ~ elsif action='status' then
- web/src/request/adapter/in/web/routes.ts:14 ~ handler: handlers.changeStatus
- web/src/request/adapter/in/web/handlers.spec.ts:1 ~ // R-001 R-002 R-004 R-006
- web/src/request/adapter/in/web/request.scenario.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/adapter/in/web/request.parity.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/application/service/TaskServices.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/domain/TaskStatus.spec.ts:1 ~ // R-002 R-003
golden:
- secured/status-invalid
- secured/status-unknown-task
- secured/status-to-in-progress
- secured/status-to-waiting
- secured/status-to-done
- secured/status-same-noop
- secured/bad-json-status
test-name:
- answers the request-route scenarios like the legacy oracle
accept:
- Given 접수 상태의 업무 / When 상태를 진행 중으로 바꾸면 / Then 200 이고 변경 이력에 `접수 → 진행 중` 이 남는다
- Given 진행 중 상태의 업무 / When 같은 상태 진행 중으로 바꾸면 / Then 200 을 돌려주되 상태와 변경 이력은 그대로다

상태는 접수·진행 중·대기·완료 넷이다. 이 밖의 값은 400, 없는 업무는 404 다. 같은 상태로 바꾸는 요청은 오류가 아니라 아무 일도 하지 않는 성공이다. 완료로 바뀔 때만 완료 시각이 기록되고, 완료에서 벗어나면 완료 시각이 비워진다. 휴지통에 있는 업무의 상태는 바꾸지 못한다(R-026). 상태 목록은 `TaskStatus.ts` 와 `supabase/schema.sql` 의 검사 제약에 있다.

### R-003 완료 업무 재개는 사유가 필요하다
layer: core
status: current
home: web/src/request
evidence:
- web/src/request/adapter/in/web/schemas.ts:47 ~ reason.length <= FIELD_MAX_LENGTH
- supabase/deletion.sql:44 ~ t.status='완료' and reason=''
- web/src/request/domain/TaskStatus.ts:11 ~ export function isReopening(
- web/src/request/domain/TaskStatus.spec.ts:1 ~ // R-002 R-003
- web/src/request/adapter/in/web/request.scenario.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/adapter/in/web/request.parity.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/application/service/TaskServices.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
golden:
- secured/reopen-without-reason-400
- secured/reopen-reason-too-long
- secured/reopen-with-reason
test-name:
- reopening a finished request needs a reason: 400 without one, and it stays finished
- answers the request-route scenarios like the legacy oracle
accept:
- Given 완료 상태의 업무 / When 사유 없이 다른 상태로 바꾸면 / Then 400 으로 거절하고 상태는 완료 그대로다
- Given 완료 상태의 업무 / When 사유를 담아 다른 상태로 바꾸면 / Then 200 이고 변경 이력에 `완료 → 진행 중 · 사유` 가 남는다

사유는 앞뒤 공백을 지운 뒤 10000자를 넘으면 400 이다. 사유 요구는 현재 상태가 완료일 때만 걸린다.

### R-004 업무 메모 추가
layer: core
status: current
home: web/src/request
evidence:
- supabase/deletion.sql:47-49 ~ elsif action='note' then
- web/src/request/adapter/in/web/schemas.ts:50 ~ const noteSchema = z
- web/src/request/adapter/in/web/routes.ts:15 ~ handler: handlers.addNote
- web/src/request/adapter/in/web/handlers.spec.ts:1 ~ // R-001 R-002 R-004 R-006
- web/src/request/adapter/in/web/request.scenario.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/adapter/in/web/request.parity.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/application/service/TaskServices.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/domain/TaskLimits.spec.ts:1 ~ // R-001 R-004
golden:
- secured/note-add
- secured/note-empty
- secured/note-too-long
- secured/note-unknown-task
- secured/same-origin-note
test-name:
- adds a trimmed note to the history and answers 201
accept:
- Given 등록된 업무 / When 메모를 보내면 / Then 201 이고 변경 이력에 `처리 메모` 가 남는다
- Given 등록된 업무 / When 빈 메모나 10000자를 넘는 메모를 보내면 / Then 400 으로 거절한다

메모는 업무 원문을 바꾸지 않고 변경 이력에만 쌓인다. 원문 정정은 R-031 이 맡는다. 없는 업무와 휴지통에 있는 업무는 404 다.

### R-005 변경 이력은 추가만 되고 시각은 서버가 기록한다
layer: core
status: current
home: web/src/request
evidence:
- supabase/schema.sql:12-22 ~ create table if not exists orbit_private.events
- supabase/deletion.sql:8-14 ~ create or replace function orbit_private.protect_events
- supabase/deletion.sql:38 ~ order by e.id
- web/src/request/adapter/in/web/ui/create/CreateDialog.tsx:57 ~ 요청일 *<input name="requested_at"
- supabase/schema.sql:14 ~ at timestamptz not null default clock_timestamp()
- web/src/request/adapter/in/web/history.char.spec.ts:77 ~ the store refuses to edit or erase an entry
golden:
- secured/detail-after-flow
test-name:
- after register, status change and note the detail lists them in the order they happened, as register, status change and note
accept:
- Given 등록·상태 변경·메모를 거친 업무 / When 상세를 조회하면 / Then 변경 이력이 발생 순서대로 `등록`·`상태 변경`·`처리 메모` 로 나온다
- Given 기록된 변경 이력 / When 수정이나 삭제를 시도하면 / Then 저장소가 거부한다

변경 이력의 시각은 DB 시계(`clock_timestamp()`)가 기록한다. 등록·상태 변경·메모의 행위자는 `총무 담당자` 로 고정된다. 삭제·복원·수정·배정·첨부 이력의 행위자는 DB 가 `admin` 으로 적는다(`supabase/deletion.sql:80`). 요청 시각만 사용자가 한국 시간으로 입력한다. 거부의 예외는 업무 영구 삭제 하나뿐이고, 그때 그 업무의 변경 이력이 함께 지워진다(R-027). 이력 보호는 트리거(`supabase/schema.sql:21-22`)라서 트리거를 끌 수 있는 DB 관리자 권한까지 막지는 못한다.

### R-006 업무 목록과 상세
layer: core
status: current
home: web/src/request
evidence:
- web/src/request/application/service/ListTasksService.ts:17 ~ tasks.map((task) => ({ ...task, ...byTask.get(task.id) }))
- web/src/request/application/service/GetTaskDetailService.ts:19 ~ return { ...task, kpi: await this.kpi(id) }
- supabase/deletion.sql:21-22 ~ if action='list' then
- supabase/deletion.sql:36-39 ~ if t.deleted_at is not null and (action<>'detail'
- web/src/request/adapter/in/web/routes.ts:11 ~ handler: handlers.list
- web/src/request/adapter/in/web/routes.ts:13 ~ handler: handlers.detail
- web/src/request/adapter/in/web/handlers.spec.ts:1 ~ // R-001 R-002 R-004 R-006
- web/src/request/adapter/in/web/request.scenario.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/adapter/in/web/request.parity.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
- web/src/request/application/service/TaskServices.spec.ts:1 ~ // R-001 R-002 R-003 R-004 R-006
golden:
- secured/list-empty
- secured/list-after-flow
- secured/detail-after-flow
- secured/detail-second-task
- secured/detail-unknown
- secured/detail-wrong-method-path
test-name:
- answers the request-route scenarios like the legacy oracle
accept:
- Given 등록된 업무가 없는 상태 / When 목록을 조회하면 / Then 빈 목록이 돌아온다
- Given 업무가 여럿 등록된 상태 / When 목록을 조회하면 / Then 최근 등록한 업무가 먼저 나온다
- Given 없는 업무 id / When 상세를 조회하면 / Then 404 다

상세는 업무 항목에 변경 이력(`events`)을 발생 순서대로 붙이고, 휴지통에 없는 업무에는 담당자·첨부 정보(`kpi`)도 붙인다. 목록 항목은 `deleted_at` 열을 지니며 휴지통 업무는 목록에서 빠진다(R-026). 담당자 정보 행이 있는 업무의 목록 항목에는 `task_id`·`assignee`·`assigned_at`·`is_test` 가 더해진다(`ListTasksService.ts` 의 `list`). golden 은 담당자 정보 행이 없는 업무만 고정한다.

## 지원

### R-007 조회 계정은 아무것도 바꾸지 못한다
layer: supporting
status: current
home: web/src/access
evidence:
- web/src/access/adapter/in/web/guardPipeline.ts:103 ~ request.method !== 'GET' && role !== 'admin'
- web/src/request/adapter/in/web/ui/detail/detailModel.ts:10 ~ return role === 'admin' && !task.deleted_at
- web/src/portal/adapter/in/web/ui/PortalApp.tsx:56 ~ classList.toggle('viewer'
golden:
- secured/viewer-create-403
- secured/viewer-status-403
- secured/viewer-notes-403
- secured/viewer-put-403
- secured/viewer-list
- secured/session-viewer
test-name:
- every write on the task routes is 403 with the viewer message, and the list afterwards is exactly what it was
accept:
- Given 조회 계정(`viewer`)으로 로그인한 상태 / When GET 이 아닌 API 를 부르면 / Then 403 이고 아무것도 바뀌지 않는다
- Given 조회 계정으로 로그인한 상태 / When 목록을 조회하면 / Then 200 이다

조회 계정은 목록·상세·설정·첨부 내려받기·발행 이력을 읽는다. 휴지통·삭제 이력·설정 변경 이력은 조회 계정에도 403 이다(R-026, R-028). 목록 응답 항목은 `deleted_at` 열을 지닌다.

### R-008 Basic 로그인과 로컬 열린 모드
layer: supporting
status: current
home: web/src/access
evidence:
- web/src/access/adapter/out/crypto/Sha256SecretComparator.ts:5 ~ export class Sha256SecretComparator
- web/src/access/adapter/in/web/guardPipeline.ts:29 ~ function unauthorized()
- web/src/access/adapter/in/web/routes.ts:8 ~ pattern: '/health', isPublic: true
- web/src/access/domain/AccessConfiguration.ts:38 ~ get shared(): boolean
- web/src/board/adapter/in/web/ui/BoardView.tsx:15 ~ 로컬 개발 모드입니다
- web/src/access/application/service/AuthorizeRequestService.ts:17 ~ if (this.configuration.openMode) return this.configuration.openModeRole
golden:
- secured/health
- secured/health-post
- secured/auth-missing-page
- secured/auth-missing-api
- secured/auth-wrong-password
- secured/auth-unknown-user
- secured/auth-bearer-scheme
- secured/session-admin
- open/open-health
- open/open-index
- open/open-session
- open/open-create
- open/open-status
- open/open-list
test-name:
- without credentials, with a wrong password, an unknown user, a password of the other account or a Bearer scheme the page and the API are 401 with the Basic challenge
- only GET /health is open: it answers ok without credentials while POST /health asks for the login
- with no password configured nothing is asked: the caller passes as admin, the session is not shared, and writes work
accept:
- Given 관리자 비밀번호가 설정된 서버 / When 인증 없이 화면이나 API 를 부르면 / Then 401 과 Basic 인증 요구가 돌아온다
- Given 관리자 비밀번호가 없는 로컬 서버 / When 인증 없이 부르면 / Then 관리자로 통과하고 세션의 `shared` 는 false 다

`/health` 의 GET 만 인증 없이 열린다. 사용자는 `admin` 과 `viewer` 둘이다. 비밀번호는 SHA-256 다이제스트끼리 시간 일정 비교로 맞춰 보므로 길이와 내용이 걸리는 시간에 드러나지 않는다. 열린 모드에서는 화면에 로컬 개발 모드 안내가 뜬다.

### R-009 다른 출처의 변경 요청은 막는다
layer: supporting
status: current
home: web/src/access
evidence:
- web/src/access/adapter/in/web/guardPipeline.ts:37 ~ function isCrossOriginWrite(
golden:
- secured/cross-origin-create-403
- secured/cross-origin-status-403
- secured/cross-origin-get-allowed
- secured/same-origin-note
test-name:
- answers the guard labels like the legacy oracle
- a POST whose Origin is not the server is 403 with the refusal message, on create and on status, and stores nothing
accept:
- Given 관리자로 로그인한 상태 / When `Origin` 이 서버 주소와 다른 POST 를 보내면 / Then 403 으로 거절한다
- Given 관리자로 로그인한 상태 / When `Origin` 이 다른 GET 을 보내면 / Then 200 으로 통과한다

### R-010 배포 설정이 없으면 서버가 뜨지 않는다
layer: supporting
status: current
home: web/src/config
evidence:
- web/src/config/startupChecks.ts:19 ~ if (production && !cloud) problems.push('운영 배포에는 DATABASE_URL이 필요합니다.')
- web/src/config/container.ts:65 ~ if (production && !env.DATABASE_URL) throw new Error(
- web/src/config/startupChecks.ts:13 ~ (production || cloud) && (!env.ADMIN_PASSWORD || !env.VIEWER_PASSWORD)
- web/src/config/databaseSecurity.ts:16 ~ DATABASE_URL must be a postgres:// URL
- web/src/config/container.ts:44-47 ~ if (env.DATABASE_URL) {
golden:
test-name:
- production without a database address refuses to start, with the passwords given or not
- production or a cloud database without both passwords refuses to start, whichever one is missing or empty
- the same password for both accounts refuses to start
accept:
- Given `NODE_ENV=production` 이고 `DATABASE_URL` 이 없는 환경 / When 서버를 시작하면 / Then 오류로 종료한다
- Given 운영 또는 `DATABASE_URL` 이 있는 환경 / When 관리자나 조회 비밀번호가 없으면 / Then 오류로 종료한다

관리자와 조회 비밀번호가 같아도 시작하지 않는다. `DATABASE_URL` 은 `postgres://` 주소여야 하고 TLS 검증을 끄는 `sslmode`·`ssl` 값이 붙으면 쓰지 않는다(`databaseSecurity.ts`). `DATABASE_URL` 이 없으면 개발·시험용 인메모리 PGlite 로 뜨고 운영에서는 시작하지 않는다. 연결 오류가 나도 PGlite 로 바꾸지 않는다. 시험은 운영 환경의 `DATABASE_URL` 누락·비밀번호 누락·같은 비밀번호를 검사하고, 주소 형식과 연결 오류의 비전환은 코드 줄로만 뒷받침된다.

### R-011 업무 보드, 검색, 상태 필터
layer: supporting
status: current
home: web/src/board
evidence:
- web/src/board/domain/groupTasks.ts:172 ~ export function groupTasks(
- web/src/board/adapter/in/web/ui/BoardToolbar.tsx:19 ~ <div className={styles.statusRow}>
- web/src/board/domain/taskSearch.ts:4 ~ export function matchesQuery(
- web/src/board/domain/taskStatus.spec.ts:1 ~ // R-011
- web/src/board/domain/boardFacts.spec.ts:1 ~ // R-011
- web/src/board/domain/elapsedLabel.spec.ts:1 ~ // R-011
- web/src/board/domain/groupTasks.spec.ts:1 ~ // R-011
- web/src/board/domain/taskSearch.spec.ts:1 ~ // R-011
golden:
test-name:
- search and status apply together and the board regroups by department
- groups by category by default with the 접수 task first and keeps completed records
accept:
- Given 업무 보드 화면 / When 검색어를 입력하면 / Then 제목·요청자·부서·내용·담당자에 대소문자 구분 없이 검색어가 들어 있는 업무만 보인다
- Given 업무 보드 화면 / When 상태를 고르면 / Then 그 상태의 업무만 보인다

보드는 업무를 분류·부서·접수 경로 중 고른 기준으로 묶고, 묶음 안은 접수 → 진행 중 → 대기 → 완료 순, 같은 상태에서는 기한이 가까운 순이다. 묶고 거르는 계산(`groupTasks.ts` 의 `groupTasks`)은 시험이 있다. 렌더링된 화면(그리기, 조회 계정의 읽기 전용 표시)을 검사하는 시험은 없고 라벨·상태 계산만 `boardLabels.spec.ts`·`boardState.spec.ts` 가 본다.

### R-012 CSV 내려받기
layer: supporting
status: current
home: web/src/request
evidence:
- web/src/request/adapter/in/web/ui/tasksCsv.ts:21 ~ export function buildTasksCsv(
- web/src/board/adapter/in/web/ui/BoardView.tsx:35 ~ tasksCsvFilename(todayKst())
- web/src/board/adapter/in/web/ui/BoardToolbar.tsx:54 ~ CSV 내보내기
golden:
test-name:
accept:
- Given 업무 보드 화면 / When CSV 내려받기를 누르면 / Then 업무, 요청자, 부서, 접수 경로, 분류, 상태, 요청일, 등록 시각, 완료 시각 열의 `총무업무_날짜.csv` 가 내려온다

파일은 BOM 이 붙은 UTF-8 이고, 셀이 `=`·`+`·`@`·`-` 로 시작하면 앞에 `'` 를 붙여 수식으로 읽히지 않게 한다. 내려받는 목록은 화면 필터와 무관하게 휴지통을 뺀 전체 업무이고 테스트 업무(R-021)도 들어 있다.

파일 내용과 이름은 `tasksCsv.char.spec.ts`·`tasksCsv.spec.ts` 가 고정한다. 버튼을 눌러 파일이 내려오는 화면 동작은 직접 검사하는 시험이 없다(리뷰에서 본다).

### R-013 누적 실적과 소요 시간
layer: supporting
status: current
home: web/src/portal
evidence:
- web/src/portal/adapter/in/web/ui/overview/overviewModel.ts:24 ~ export function statCards(
- web/src/portal/adapter/in/web/ui/overview/overviewModel.ts:30 ~ t.due_date && t.due_date < today && t.status !== '완료'
- web/src/shared/adapter/in/web/ui/format.ts:35 ~ export function completionPercent(
- web/src/portal/adapter/in/web/ui/overview/overviewModel.ts:70 ~ export function kpiStrip(
- web/src/portal/adapter/in/web/ui/overview/autoRefresh.ts:4 ~ export const AUTO_REFRESH_MS = 30000
- web/src/report/domain/MonthlyMetrics.ts:52 ~ const hours = completed.map
golden:
test-name:
accept:
- Given 업무가 여럿 쌓인 상태 / When 대시보드 위쪽 통계를 보면 / Then 전체 업무는 휴지통·테스트 업무를 뺀 누적 접수 건수, 진행 중·완료 업무는 같은 범위의 현재 상태 건수, 기한 초과는 기한이 오늘(한국 시간)보다 앞서면서 완료가 아닌 건수다
- Given 이번 달에 완료된 업무가 있는 상태 / When 대시보드의 이번 달 운영 지표를 보면 / Then 평균 경과는 그 업무들의 요청 시각부터 완료 시각까지 달력 시간(대기·주말 포함)을 시간 단위로 평균한 값이다

통계는 누적 기준이다. 소요 시간은 현재 완료 상태인 업무만 센다. 재개하면 완료 시각이 비워지므로 그 업무는 다시 완료될 때까지 빠진다. 평균 경과는 월간 지표(R-022)와 같은 계산이다. 대시보드는 활성 화면에서 30초마다 목록을 다시 불러온다(`autoRefresh.ts` 의 `AUTO_REFRESH_MS`).

카드 숫자는 `overviewStats.char.spec.ts` 가 요청 등록부터 목록·계산까지 고정하고, `overviewModel.spec.ts` 가 계산을, `autoRefresh.spec.ts` 가 30초 갱신의 조건을 본다. 월간 계산은 R-022 의 시험이 본다. 화면에 그려지는 모양은 검사하는 시험이 없다.

### R-014 웹 골격의 Request 예시
layer: supporting
status: dropped
evidence:
golden:
test-name:
accept:

폐기했다. 이 요구사항은 `web/` 이 비어 있을 때 헥사고날 배치를 보이려고 둔 예시 애그리거트 `Request` 였고, 기존 포털의 어떤 동작도 아니다. 실제 업무 유스케이스(`web/src/request/application/service/createRequestUseCases.ts`)가 같은 컨텍스트에서 기존 포털의 동작을 DB 함수 호출로 옮기므로 예시는 쓰이지 않는다. 상태 넷(received·inProgress·done·rejected)과 같은 상태 변경 오류는 기존 포털 규칙(R-002)과 갈렸고 어떤 화면도 쓰지 않았다. 코드·시험·컨테이너 연결을 지웠고 번호는 다시 쓰지 않는다.

## 후속 기능

### R-015 첨부파일
layer: supporting
status: current
home: web/src/attachment
evidence:
- supabase/kpi.sql:3 ~ orbit_private.task_files
- supabase/kpi.sql:45-55 ~ elsif action='file_add' then
- web/src/attachment/adapter/in/web/ui/AttachmentSection.tsx:37 ~ 첨부파일 추가 (최대 1MB, 업무당 10개)
- web/src/attachment/adapter/in/web/ui/AttachmentSection.tsx:25 ~ data-file-delete
- web/src/attachment/adapter/in/web/routes.ts:21 ~ /files$/,
- web/src/attachment/adapter/in/web/attachment.parity.spec.ts:1 ~ attachment routes (R-015)
- web/src/attachment/adapter/in/web/attachment.scenario.spec.ts:48 ~ uploading an attachment over HTTP [R-015]
- web/src/attachment/adapter/in/web/attachment.scenario.spec.ts:137 ~ downloading and deleting an attachment over HTTP [R-015]
- web/src/attachment/application/service/attachmentServices.spec.ts:27 ~ UploadAttachmentService [R-015]
- web/src/attachment/domain/AttachmentUpload.spec.ts:18 ~ AttachmentUpload [R-015]
golden:
test-name:
- each step answers as the legacy portal did and the published report survives the purge of its request
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
- the 10th file is 201 and the 11th is 400 with the limit message; another task is not affected
- stores 1, 1048575 and 1048576 bytes as 201 with an id and keeps name, size and the octet-stream type
- the viewer account cannot upload: 403 with the viewer message, and no row is added
accept:
- Given 관리자가 연 업무 / When 허용 확장자(pdf·png·jpg·jpeg·webp·txt·csv·xlsx·docx)의 1MB 이하 파일을 올리면 / Then 201 과 파일 id 가 돌아오고 업무 이력에 `첨부파일 등록` 이 남는다
- Given 허용하지 않는 확장자(`.html`)의 파일 / When 올리면 / Then 400 으로 거절한다
- Given 조회 계정 / When 첨부를 내려받으면 / Then 내용이 같은 파일이 `attachment` 헤더로 내려오고, 올리기나 삭제는 403 이다
- Given 첨부가 달린 업무 / When 그 업무를 영구 삭제하면 / Then 첨부파일도 함께 사라진다

첨부는 DB 행으로 저장하며 파일당 1MB, 업무당 10개다(`supabase/kpi.sql:46-47`). 삭제는 업무 이력에 `첨부파일 삭제` 를 남긴다. `첨부파일 등록`·`첨부파일 삭제` 이력, 업무당 10개(11번째는 400), 파일당 1MB(1048576바이트는 받고 1048577바이트부터 400)는 `attachmentHistory.char.spec.ts` 와 `attachment.scenario.spec.ts` 가 SQL 함수까지 가는 흐름으로 고정한다. 한도 값은 `AttachmentUpload.spec.ts` 가 본다. 관찰: base64 로 풀면 0바이트인 content 는 400 이고 메시지가 1MB 초과 문구로 나온다(`attachment.scenario.spec.ts` 의 두 번째 케이스).

### R-016 팀장 확인과 댓글
layer: out
status: planned
home: web/src/request
evidence:
- web/src/request/adapter/in/web/routes.ts:8 ~ export function requestRoutes(

요청 라우트(`routes.ts` 의 `requestRoutes`)에 팀장 확인이나 댓글 경로가 없다.

### R-017 월별 기간 필터
layer: supporting
status: current
home: web/src/report
evidence:
- web/src/report/adapter/in/web/ui/ReportView.tsx:45 ~ state.reportMonth ?? currentMonth(
- web/src/report/adapter/in/web/ui/ReportView.tsx:115 ~ id="report-month"
- web/src/report/adapter/in/web/ui/reportFlow.ts:24 ~ export function changeReportMonth(
- web/src/report/domain/ReportErrors.ts:4 ~ 조회 월을 확인하세요.
- web/src/report/adapter/in/web/routes.ts:21 ~ pattern: '/api/report-preview'
- web/src/report/domain/ReportMonth.spec.ts:1 ~ // R-017
- web/src/report/adapter/in/web/report.parity.spec.ts:1 ~ (R-013, R-017, R-022..R-024)
golden:
test-name:
- KST month boundaries, due dates, denominators, tests, deleted, bad times and the median
- a month needs four digits, a dash and 01..12
- Given the preview route, When the month is bad or absent, Then 400 with the month message; a future month answers 200
accept:
- Given 여러 달에 걸쳐 접수·완료된 업무 / When 업무 실적 화면에서 조회 월을 고르면 / Then 그 달(한국 시간)에 요청받은 업무와 그 달에 완료된 업무만 지표에 집계된다
- Given `YYYY-MM` 형식이 아니거나 없는 달(`2026-13`) / When 그 월로 지표를 요청하면 / Then 400 `조회 월을 확인하세요.` 로 거절한다

기간 필터는 업무 실적 화면의 월 입력 하나다. 기본값은 현재 월이고(`ReportView.tsx:45`), 업무 보드·목록·CSV 에는 기간 필터가 없다(필터는 검색어와 상태뿐이다, R-011). 월 경계 계산과 잘못된 월의 예외는 `MonthlyMetrics.spec.ts`·`ReportMonth.spec.ts` 가 본다. 서버가 그 예외를 400 으로 바꾸는 동작은 `report.scenario.spec.ts` 가 고정한다(월 매개변수 없음 포함). 월 입력 칸이 값을 검사하고 화면을 다시 그리는 흐름은 `reportFlow.spec.ts` 가 본다.

### R-018 AI 요약
layer: out
status: planned
home: web/src/report
evidence:
- web/src/report/domain/MonthlyDraft.ts:1 ~ Not generative AI

규칙 기반 자동 초안(R-023)과 자동 분류(R-030)는 생성형 AI 요약이 아니다. `web/src` 의 어느 코드에도 외부 AI 호출이 없다.

### R-019 개인별 인증
layer: out
status: planned
home: web/src/access
evidence:
- web/src/access/application/service/AuthorizeRequestService.ts:23 ~ credentials.user === 'admin'
- web/src/access/domain/Role.ts:1 ~ export const ROLES = ['admin', 'viewer']

공용 `admin`·`viewer` 비밀번호만 있고 개인별 계정은 없다(`AuthorizeRequestService.ts` 의 `authorize`).

## 확장 기능

### R-020 담당자 배정과 최초 배정 시각
layer: core
status: current
home: web/src/assignment
evidence:
- web/src/assignment/domain/AssigneeName.ts:2 ~ 담당자를 1~100자로 입력하세요.
- web/src/request/application/service/ListTasksService.ts:17 ~ tasks.map((task) => ({ ...task, ...byTask.get(task.id) }))
- supabase/kpi.sql:41-44 ~ elsif action='assign' then
- web/src/request/adapter/in/web/ui/detail/DetailDialog.tsx:149 ~ <h3>담당자 · 첨부파일</h3>
- web/src/assignment/adapter/in/web/ui/AssignmentApi.ts:12 ~ /assign
- web/src/board/domain/taskLabels.ts:11 ~ 담당 ${task.assignee?.trim() || '미배정'}
- web/src/assignment/adapter/in/web/routes.ts:34 ~ /assign$/
- web/src/assignment/adapter/in/web/assignment.scenario.spec.ts:37 ~ assigning a task over HTTP [R-020]
- web/src/assignment/application/service/assignmentServices.spec.ts:27 ~ AssignTaskService [R-020]
- web/src/assignment/domain/AssigneeName.spec.ts:5 ~ AssigneeName [R-020]
- web/src/assignment/adapter/in/web/assignment.parity.spec.ts:1 ~ (R-020, R-021, kpi-status)
golden:
test-name:
- each step answers as the legacy portal did and the published report survives the purge of its request
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
- the administrator assigns a name of 1, 99 and 100 characters and the stored name is the trimmed one
- an empty, blank or 101-character name is 400 with the range message and the stored name stays
- trims before counting: whitespace-only is empty, 100 characters padded with blanks is accepted, 101 padded is rejected
accept:
- Given 등록된 업무 / When 관리자가 담당자 이름을 1~100자로 배정하면 / Then 200 이고 상세에 최초 배정 시각이 기록되며 목록의 담당자가 그 이름이다
- Given 이미 배정된 업무 / When 다른 담당자로 다시 배정하면 / Then 담당자는 바뀌지만 최초 배정 시각은 처음 값 그대로다
- Given 조회 계정 / When 배정을 보내면 / Then 403 이다

담당자 이름은 앞뒤 공백을 지운 뒤 1~100자여야 하고 비었거나 101자면 400 이다(`AssigneeName.ts` 의 `ASSIGNEE_RANGE_MESSAGE`). 경계(1·99·100자 수락, 0·101자 거절)·공백 처리·없는 업무 404·조회 계정 403 은 `assignment.scenario.spec.ts`·`AssigneeName.spec.ts` 가 고정한다. 관찰: 길이를 UTF-16 단위로 세어 이모지 50개(100단위)는 받고 51개는 거절한다. 휴지통의 업무는 배정할 수 없다. 변경 이력 `담당자 배정` 의 상세는 새 담당자 이름만 남는다(`supabase/kpi.sql:44`). 이전 담당자를 함께 적던 로컬 저장소 문구는 없어졌다. 보드의 업무 행에는 `담당 <이름>` 또는 `담당 미배정` 이 보인다.

### R-021 실제 업무와 테스트 업무 구분
layer: supporting
status: current
home: web/src/assignment
evidence:
- supabase/kpi.sql:38-40 ~ elsif action='mark_test' then
- web/src/report/domain/MonthlyMetrics.ts:44 ~ !t.deleted_at && !t.is_test
- web/src/automation/domain/automation.ts:62 ~ export function similarTasks(
- web/src/portal/adapter/in/web/ui/overview/overviewModel.ts:12 ~ tasks.filter((t) => !t.is_test)
- web/src/request/adapter/in/web/ui/detail/DetailDialog.tsx:152 ~ isTest: Boolean(kpi?.is_test)
- web/src/board/domain/taskLabels.ts:3 ~ const TEST_MARK = '[테스트]'
- web/src/assignment/adapter/in/web/routes.ts:25 ~ /test-data$/
- web/src/assignment/adapter/in/web/assignment.scenario.spec.ts:97 ~ marking test data over HTTP [R-021]
- web/src/assignment/application/service/assignmentServices.spec.ts:60 ~ MarkTestDataService [R-021]
- web/src/assignment/domain/TestDataFlag.spec.ts:5 ~ TestDataFlag [R-021]
- web/src/assignment/adapter/in/web/assignment.parity.spec.ts:1 ~ (R-020, R-021, kpi-status)
golden:
test-name:
- KST month boundaries, due dates, denominators, tests, deleted, bad times and the median
- leaves out deleted tasks and test records
- each step answers as the legacy portal did and the published report survives the purge of its request
- flipping to test data and back writes one sentence per direction and the list shows the flag each time
- a value that is not a boolean is 400 and writes no history row; the real booleans still work afterwards
- setting the same value again still writes a history row: there is no change detection
accept:
- Given 완료된 실제 업무 / When 관리자가 테스트 업무로 바꾸면 / Then 월간 지표의 접수·완료에서 빠지고 변경 이력에 `데이터 구분 변경` 이 남는다
- Given 테스트 업무 / When 월간 지표와 유사 업무를 구하면 / Then 테스트 업무는 지표에 세지 않고 `excludedTests` 로만 센다
- Given 구분 값이 참·거짓이 아닌 요청 / When 구분을 바꾸면 / Then 400 이다

담당자 정보 행이 없는 업무는 실제 업무다. 보드에서 테스트 업무는 제목 앞에 `[테스트]` 가 붙는다. 대시보드 통계(R-013)도 테스트 업무를 뺀다. `assignmentHistory.char.spec.ts` 가 방향별 이력 문구(`실제 업무 · 지표 포함` 등)와 참·거짓이 아닌 값의 400(이력 없음), 없는 업무보다 값 검사가 먼저인 순서를 고정한다. 관찰: 현재 값과 같은 구분을 다시 보내도 `데이터 구분 변경` 이력이 한 줄 더 쌓인다.

### R-022 월별 운영 지표 집계
layer: supporting
status: current
home: web/src/report
evidence:
- web/src/report/domain/MonthlyMetrics.ts:42 ~ export function monthlyMetrics(
- web/src/report/adapter/in/web/ui/ReportView.tsx:15 ~ function MetricCards(
- web/src/report/adapter/in/web/ui/ReportView.tsx:115 ~ id="report-month"
- web/src/report/adapter/in/web/ui/ReportView.tsx:122 ~ id="metrics-csv"
- web/src/portal/adapter/in/web/ui/overview/overviewModel.ts:70 ~ export function kpiStrip(
- web/src/report/adapter/in/web/routes.ts:21 ~ pattern: '/api/report-preview'
- web/src/report/domain/MonthlyMetrics.spec.ts:1 ~ // R-022
- web/src/report/adapter/in/web/report.scenario.spec.ts:1 ~ // R-022, R-023: from the HTTP handler through the services to the real SQL functions (in-memory PGlite).
- web/src/report/adapter/in/web/report.parity.spec.ts:1 ~ (R-013, R-017, R-022..R-024)
golden:
test-name:
- KST month boundaries, due dates, denominators, tests, deleted, bad times and the median
- each step answers as the legacy portal did and the published report survives the purge of its request
- Given the preview route, When the month is bad or absent, Then 400 with the month message; a future month answers 200
accept:
- Given 여러 달에 걸친 업무 / When 월을 정해 집계하면 / Then 접수는 요청 시각이 그 달인 업무 수, 완료는 현재 완료 상태이고 완료 시각이 그 달인 업무 수이며 삭제·테스트 업무와 완료 시각이 요청보다 빠른 업무는 세지 않는다
- Given 기한이 있는 완료 업무와 기한 없는 완료 업무 / When 집계하면 / Then 완료 기준 준수율은 기한 있는 완료 건을 분모로, 완료 날짜가 기한 날짜 이내인 건을 분자로 소수 첫째 자리까지 구하고 분모가 0 이면 값이 비어 있다
- Given 선택월에 기한이 있는 업무 / When 집계하면 / Then 기한 도래 기준 준수율은 오늘까지 기한이 도래한 업무(미완료 포함)를 분모로 기한 내 완료한 건을 분자로 구한다
- Given 완료 업무가 있는 달 / When 집계하면 / Then 평균·중앙값은 요청부터 완료까지 달력 시간(대기·주말 포함)을 시간 단위로 구하고 대상이 없으면 값이 비어 있다

날짜와 월 경계는 한국 시간이다. 잘못된 시각·기한을 가진 업무는 `invalid` 로 따로 센다. 집계는 현재 상태 기준이라 과거 월말 상태를 복원한 수치가 아니다. 업무 실적 화면은 위 값을 카드로 보이고 지표 CSV(`지표,값` 두 열)로 내려받을 수 있다. 월간 접수·완료·평균 경과는 대시보드의 이번 달 카드에도 쓰인다. 형식이 어긋난 월은 400, 미래 월 집계는 200 이며 조회 계정도 읽는다(`report.scenario.spec.ts`). 집계 계산은 `MonthlyMetrics.spec.ts` 가, 지표 CSV 의 내용은 `metricsCsv.spec.ts` 가 본다. 카드가 화면에 그려지는 모양은 검사하는 시험이 없다.

### R-023 월간 보고서 초안과 발행
layer: supporting
status: current
home: web/src/report
evidence:
- web/src/report/domain/ReportFingerprint.ts:6 ~ export function fingerprintSource(
- web/src/report/domain/MonthlyDraft.ts:7 ~ export function monthlyDraft(
- supabase/kpi.sql:6 ~ orbit_private.monthly_reports
- supabase/kpi.sql:14-15 ~ drop trigger if exists report_immutable
- supabase/kpi.sql:30-31 ~ if action='reports' then
- web/src/report/adapter/in/web/ui/ReportView.tsx:205 ~ id="monthly-draft"
- web/src/report/adapter/in/web/ui/ReportView.tsx:208 ~ id="publish-report"
- web/src/report/adapter/in/web/routes.ts:29-30 ~ method: 'POST'
- web/src/report/domain/ReportDraft.spec.ts:1 ~ // R-023
- web/src/report/domain/ReportFingerprint.spec.ts:1 ~ // R-023
- web/src/report/application/service/PublishReportService.spec.ts:1 ~ // R-023
- web/src/report/adapter/in/web/report.scenario.spec.ts:1 ~ // R-022, R-023: from the HTTP handler through the services to the real SQL functions (in-memory PGlite).
- web/src/report/adapter/in/web/report.parity.spec.ts:1 ~ (R-013, R-017, R-022..R-024)
golden:
test-name:
- each step answers as the legacy portal did and the published report survives the purge of its request
- KST month boundaries, due dates, denominators, tests, deleted, bad times and the median
- Given a fresh fingerprint, When publishing next month or 9999-12, Then FutureMonthError and nothing is saved
- Given the draft limit, When 20000 and 20001 characters are published, Then 20000 is saved and 20001 is refused
- Given a wrong or missing fingerprint, When publishing a future or malformed month, Then 409 comes first and nothing is saved
- Given no draft, When publishing, Then the rule-based draft is saved; given blanks only, Then an empty text is saved
accept:
- Given 월간 지표를 집계한 화면 / When 관리자가 검토한 문안으로 발행하면 / Then 201 이고 그 시점의 집계값과 문안이 발행 이력에 보존된다
- Given 집계한 뒤 업무가 바뀐 상태 / When 처음 집계의 지문으로 발행하면 / Then 409 로 거절하고 새로 집계해야 한다
- Given 조회 계정 / When 발행하면 / Then 403 이고 발행 이력은 읽을 수 있다
- Given 발행본이 있는 상태 / When 그 발행본의 원 업무를 영구 삭제하면 / Then 발행본은 그대로 남고 저장소가 발행본의 수정·삭제를 거부한다

초안은 집계값을 채운 규칙 기반 문안이고 생성형 AI 를 쓰지 않는다. 발행 요청에 문안(`draft`)이 없으면 규칙 기반 초안이 발행된다. 같은 월을 다시 발행하면 발행본이 별도 버전으로 쌓인다. 미래 월 발행은 400, 문안은 앞뒤 공백을 지운 뒤 20000자까지 받고 20001자부터 400 이며, 지문 검사(409)가 월 검사보다 먼저다. 이 순서와 경계는 `PublishReportService.spec.ts`·`ReportDraft.spec.ts` 와 `report.scenario.spec.ts` 가 고정한다. 관찰: 공백만 있는 문안은 빈 문안으로 발행되고 규칙 기반 초안으로 대체되지 않는다. 발행본 문안이 다시 읽히는지는 PGlite 위에서 도는 `report.scenario.spec.ts` 의 첫 케이스가 본다.

### R-024 발행본 PDF 내려받기
layer: supporting
status: current
home: web/src/report
evidence:
- web/src/report/adapter/in/web/ui/ReportView.tsx:225 ~ data-report-id
- web/src/report/adapter/in/web/ui/pdf/createReportPdf.ts:36 ~ export async function createReportPdf(
- web/src/report/adapter/in/web/ui/pdf/createReportPdf.ts:9 ~ /fonts/NanumGothic-Regular.ttf
golden:
test-name:
- the file is named month, 월간처리현황 and the first eight characters of the report id
- a long draft becomes several A4 pages and the Korean font bytes are embedded in the file
- every page of a split document carries "current / total" and the figures of the report are not drawn, only the draft
- a long draft becomes a PDF of three or more A4 pages that carries the document properties
accept:
- Given 발행 이력에 발행본이 있는 상태 / When 발행본 내려받기를 누르면 / Then 한글 글꼴을 포함한 A4 PDF 가 `<월>_월간처리현황_<발행본 id 앞 8자>.pdf` 로 내려온다
- Given 여러 쪽 분량의 문안 / When PDF 를 만들면 / Then 쪽이 나뉘고 쪽마다 `현재쪽 / 전체쪽` 번호가 붙는다
- Given 집계값이 담긴 발행본 / When PDF 를 만들면 / Then 문안만 그려지고 원시 집계값은 들어가지 않는다

PDF 는 브라우저가 만든다. 서버는 글꼴(`/fonts/NanumGothic-Regular.ttf`)만 내주고 PDF 는 누르는 순간 `createReportPdf` 를 불러 만든다. 글꼴에 없는 글자는 `□` 로 그린다(`createReportPdf.ts:45`). 쪽 번호와 원시 집계값 제외를 `pdftotext` 로 읽어 보는 케이스는 `ORBIT_PDF_CHECK` 가 있을 때만 돌고 없으면 건너뛴다. 버튼을 눌러 파일이 내려오는 화면 동작은 직접 검사하는 시험이 없다.

### R-025 개선 이력 관리대장
layer: supporting
status: current
evidence:
- server.js:44-46 ~ path==='/api/improvements'&&req.method==='GET'
- public/kpi-model.js:21 ~ export function validateImprovement
- kpi-store-local.js:5-6 ~ CREATE TABLE IF NOT EXISTS improvements(
- kpi-store-local.js:8-9 ~ improvement_events_no_delete
- kpi-store-local.js:24-26 ~ action==='improvements'
- supabase/kpi.sql:4-5 ~ orbit_private.improvements
- supabase/kpi.sql:12-13 ~ drop trigger if exists improvement_audit
- supabase/kpi.sql:22-29 ~ if action='improvements' then
- public/kpi-ui.js:22-33 ~ export async function renderImprovements
- web/src/improvement/adapter/in/web/routes.ts:19 ~ pattern: '/api/improvements'
- web/src/improvement/adapter/in/web/improvement.scenario.spec.ts:1 ~ // R-025: from the HTTP handler through the services to the real SQL functions (in-memory PGlite).
- web/src/improvement/adapter/in/web/improvement.parity.spec.ts:1 ~ (R-025)
- web/src/improvement/application/service/ImprovementServices.spec.ts:1 ~ // R-025
- web/src/improvement/domain/ImprovementValue.spec.ts:1 ~ // R-025
golden:
test-name:
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
- 무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
- 필수 항목이 비었거나 단계·상태가 목록 밖이거나 검증 완료에 결과가 없으면 400 이고 대장이 늘지 않는다
- 항목은 5000자까지 201 이고 앞뒤 공백을 지운 뒤 센다
accept:
- Given 관리자 / When 개선 제목·피드백·단계·상태를 담아 저장하면 / Then 201 이고 새 개선 항목이 생기며 저장 전후 값이 수정 이력에 남는다
- Given 이미 수정된 개선 항목 / When 낡은 버전 번호로 저장하면 / Then 409 로 거절한다
- Given 상태가 검증 완료인데 검증 결과가 비었다 / When 저장하면 / Then 거절한다
- Given 조회 계정 / When 개선 항목을 저장하면 / Then 403 이고 목록·수정 이력은 읽을 수 있다

단계는 `MVP 구축`·`본인 실사용`·`정착 운영`, 상태는 `접수`·`개선 중`·`검증 완료` 이고 항목별 5000자를 넘으면 거절한다(`public/kpi-model.js:21`). 검증 결과·단계·상태 거절과 그 400 변환, 버전 누락·0·문자열·소수의 400, 없는 id 의 404, 검증이 버전 검사보다 먼저인 순서는 `test/char-kpi.test.js` 가 고정한다. 개선 항목 목록은 CSV 로 내려받을 수 있다(`public/kpi-ui.js:32`, 시험 없음).

### R-026 업무 삭제와 복원(휴지통)
layer: core
status: current
evidence:
- server.js:34 ~ ['/api/trash','/api/lifecycle-history']
- server.js:57 ~ notes|delete|restore|purge|edit
- server.js:61 ~ ['delete','restore','purge'].includes(match[2])
- local-store.js:23-25 ~ function lifecycle(
- local-store.js:29 ~ lifecycleHistory:()
- local-store.js:34-35 ~ list:()=>db.prepare('SELECT * FROM tasks WHERE deleted_at IS NULL
- local-store.js:37-38 ~ status:(id,status,reason)=>transaction
- supabase/deletion.sql:21-22 ~ if action='list' then
- supabase/deletion.sql:36 ~ if t.deleted_at is not null and (action<>'detail'
- supabase/deletion.sql:62 ~ if action='trash' then
- supabase/deletion.sql:68-69 ~ if action='delete' and t.deleted_at is not null
- supabase/deletion.sql:79-80 ~ update orbit_private.tasks set deleted_at=case
- public/app.js:35 ~ $('#delete-task').onclick
- public/app.js:57-62 ~ $('#open-trash').onclick
- web/src/request/adapter/in/web/lifecycle.parity.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/lifecycleSchemas.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/application/service/LifecycleServices.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/domain/TaskEdit.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/routes.ts:17 ~ handlers.lifecycle('delete')
- web/src/request/adapter/in/web/routes.ts:18 ~ handlers.lifecycle('restore')
- web/src/request/domain/TaskLifecycle.ts:1 ~ R-026 delete and restore
golden:
test-name:
- 모든 상태 삭제·조회 차단·복원·제목 확인 후 영구 삭제 및 최소 감사 기록
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 어떤 상태든 업무 / When 관리자가 사유를 담아 삭제하면 / Then 200 이고 업무가 목록에서 빠지며 상태 변경이 409 로 막힌다
- Given 사유가 빈 삭제 요청 / When 보내면 / Then 400 으로 거절한다
- Given 휴지통의 업무 / When 조회 계정이 휴지통·삭제 이력·삭제된 업무 상세를 부르면 / Then 403 또는 404 다
- Given 휴지통의 업무 / When 관리자가 사유를 담아 복원하면 / Then 200 이고 삭제 전 상태 그대로 목록에 돌아온다

사유는 앞뒤 공백을 지운 뒤 1~1000자여야 한다(`server.js` 의 `사유를 1~1000자로 입력하세요`). 이미 휴지통에 있는 업무의 삭제와 휴지통에 없는 업무의 복원은 409 다. 삭제와 복원은 업무 이력에 `업무 삭제`·`업무 복원` 을 남긴다(`local-store.js` 의 `업무 삭제`, `supabase/deletion.sql:80`). 복원이 완료 시각과 처리 이력을 그대로 두는지는 시험이 상태만 본다. 휴지통 업무는 목록·통계·CSV·월간 지표에서 빠지고 담당자·첨부도 바꾸지 못한다(`kpi-store-local.js:14`, `public/kpi-ui.js:36`).

### R-027 제목 확인 후 영구 삭제와 삭제 이력
layer: core
status: current
evidence:
- server.js:61 ~ ['delete','restore','purge'].includes(match[2])
- local-store.js:20-22 ~ CREATE TABLE IF NOT EXISTS task_lifecycle_events
- local-store.js:23-25 ~ function lifecycle(
- local-store.js:29 ~ lifecycleHistory:()
- kpi-store-local.js:3-4 ~ CREATE TABLE IF NOT EXISTS task_extras
- supabase/deletion.sql:3-6 ~ create table if not exists orbit_private.task_lifecycle_events
- supabase/deletion.sql:15-16 ~ drop trigger if exists lifecycle_immutable
- supabase/deletion.sql:63 ~ if action='history' then
- supabase/deletion.sql:70-77 ~ if action='purge' and coalesce(payload->>'confirmation'
- supabase/kpi.sql:2-3 ~ create table if not exists orbit_private.task_extras
- public/app.js:62-63 ~ [data-restore],[data-purge]
- web/src/request/adapter/in/web/lifecycle.parity.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/lifecycleSchemas.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/application/service/LifecycleServices.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/domain/TaskEdit.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/routes.ts:19 ~ handlers.lifecycle('purge')
- web/src/request/domain/TaskLifecycle.ts:1 ~ R-027 purge
golden:
test-name:
- 모든 상태 삭제·조회 차단·복원·제목 확인 후 영구 삭제 및 최소 감사 기록
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 휴지통의 업무 / When 업무 제목과 다른 문자열로 영구 삭제하면 / Then 400 으로 거절하고 업무는 휴지통에 남는다
- Given 휴지통의 업무 / When 업무 제목을 정확히 입력해 영구 삭제하면 / Then 200 이고 업무 행과 처리 이력이 DB 에서 사라지고 첨부파일도 함께 사라진다
- Given 영구 삭제한 업무 / When 삭제 이력을 조회하면 / Then 업무 id·시각·행위자·작업·사유 행이 남아 있고 저장소가 그 행의 수정·삭제를 거부한다
- Given 영구 삭제 대상이 아닌 업무(휴지통에 없음) / When 영구 삭제를 보내면 / Then 409 다

삭제 이력 조회는 최근 100건이고 관리자만 본다(`local-store.js` 의 `lifecycleHistory`, `supabase/deletion.sql:63`). 이력 행에는 업무 제목·본문을 복제하지 않는다(로컬은 제목 열에 고정 문구를 넣고 `local-store.js` 의 `[업무 삭제 이력]`, 클라우드 표에는 제목 열이 없다 `supabase/deletion.sql:3-6`). 영구 삭제는 처리 이력 보호의 유일한 예외로, 로컬은 삭제 트리거를 잠시 내리고(`local-store.js` 의 `DROP TRIGGER events_no_delete`) 클라우드는 업무별 허용 설정을 쓴다(`supabase/deletion.sql:11`). 이미 발행한 월간 보고서는 영구 삭제의 영향을 받지 않는다(R-023). 사람 개인은 식별하지 않고 공용 `admin` 이 기록된다.

### R-028 관리자 공통 설정과 변경 이력
layer: supporting
status: current
evidence:
- server.js:30-32 ~ path==='/api/settings'&&req.method==='GET'
- local-store.js:14-18 ~ CREATE TABLE IF NOT EXISTS portal_settings
- local-store.js:31-33 ~ settings:()=>{const r=db.prepare('SELECT * FROM portal_settings
- supabase/settings.sql:2-14 ~ create table if not exists orbit_private.portal_settings
- supabase/settings.sql:25-33 ~ select * into s from orbit_private.portal_settings
- public/admin-settings.js:3-18 ~ export async function openSettings
- public/settings-model.js:7-8 ~ export const defaults=
- public/app.js:44-55 ~ function applySettings()
- public/app.js:41 ~ $('#admin-settings').onclick
- public/app.js:42-52 ~ config=await api('settings')
- web/src/settings/adapter/in/web/routes.ts:26 ~ pattern: '/api/settings',
- web/src/settings/adapter/in/web/settings.parity.spec.ts:1 ~ // R-028 R-029
- web/src/settings/adapter/in/web/settings.scenario.spec.ts:1 ~ // R-028 R-029
- web/src/settings/application/service/SettingsServices.spec.ts:1 ~ // R-028 R-029
- web/src/settings/domain/PortalSettings.spec.ts:1 ~ // R-029 R-028
golden:
test-name:
- 설정 API 권한·버전 충돌·이력과 재시작 후 공통 설정 보존
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
- 경계값(문구 1000자·선택 항목 30개·항목 50자·로고 280000자)은 모두 200 으로 저장되고 버전이 하나씩 오른다
- 조회 계정은 저장할 수 없고(403) 읽기는 200 이며 버전과 이력이 그대로다
accept:
- Given 조회 계정 / When 설정을 저장하거나 설정 변경 이력을 조회하면 / Then 403 이고 설정 값 읽기는 200 이다
- Given 관리자 / When 최신 버전 번호로 설정을 저장하면 / Then 200 이고 버전이 1 오르며 수정 전후 값이 `admin` 으로 변경 이력에 남는다
- Given 이미 저장되어 버전이 오른 설정 / When 낡은 버전 번호로 저장하면 / Then 409 로 거절한다
- Given 저장된 공통 설정 / When 서버를 다시 시작하면 / Then 모든 계정이 같은 설정을 읽는다

설정은 포털 문구·메뉴·배너·업무 분류/접수 경로/우선순위 선택 항목·이미지 로고·색상이다. 상태 단계와 보안 설정은 설정 대상이 아니다(`public/settings-model.js` 의 `defaults`, 정의에 없는 필드는 `validateSettings` 가 거절한다). 선택 항목을 바꿔도 기존 업무의 값은 그대로다. 변경 이력은 최근 30건이다(`local-store.js` 의 `LIMIT 30`). 설정 DB 가 준비되지 않은 클라우드에서는 기본값과 안내를 돌려준다(`server.js` 의 `SETTINGS_MIGRATION_REQUIRED`, 시험 없음). 경계값 저장(문구 1000자·선택 항목 30개·항목 50자·로고 280000자)과 저장 시 문구 공백 제거·기본값 보충은 `test/char-kpi.test.js` 가 고정한다. 설정 창의 화면 동작은 브라우저 시험(`test/board-ui.test.js`)이 있지만 Playwright 가 있을 때만 돈다.

### R-029 설정 값 검증
layer: supporting
status: current
evidence:
- public/settings-model.js:14-26 ~ export function validateSettings
- server.js:32 ~ validateSettings(body.values)
- server.js:69 ~ if(e.status)return send(e.status
- web/src/settings/adapter/in/web/routes.ts:26 ~ pattern: '/api/settings',
- web/src/settings/adapter/in/web/settings.parity.spec.ts:1 ~ // R-028 R-029
- web/src/settings/adapter/in/web/settings.scenario.spec.ts:1 ~ // R-028 R-029
- web/src/settings/application/service/SettingsServices.spec.ts:1 ~ // R-028 R-029
- web/src/settings/domain/PortalSettings.spec.ts:1 ~ // R-029 R-028
golden:
test-name:
- 설정 입력 검증: 색상·이미지·중복·빈 항목·임의 필드 차단
- 잘못된 값은 모두 400 이고 버전과 이력이 그대로다
- 입력 검증은 버전 충돌 검사보다 먼저다 (잘못된 값 + 낡은 버전은 409 가 아니라 400)
accept:
- Given 분류 목록이 비었거나 같은 항목이 두 번 있는 설정 / When 검증하면 / Then 오류를 던진다
- Given `#rrggbb` 형식이 아닌 색상, PNG·JPEG·WebP 가 아닌 로고, 정의에 없는 필드 / When 검증하면 / Then 오류를 던진다
- Given 마크업이 들어 있는 문구 / When 검증하면 / Then 글자 그대로 통과한다

문구는 항목마다 1~1000자, 선택 항목은 1~30개에 항목당 1~50자, 로고는 PNG·JPEG·WebP 데이터 URL 이고 280000자 이하다. 검증 예외의 `status` 400 을 서버가 응답으로 바꾸는 동작은 `test/char-kpi.test.js` 가 고정한다(잘못된 값마다 400, 버전·이력 불변, 검증이 버전 충돌 검사보다 먼저). 마크업 문구를 화면에서 이스케이프하는 줄은 시험이 보지 않는다. 관찰: `texts` 가 배열이어도 `normalizeSettings` 가 객체로 펼쳐 저장되므로 `문구 설정을 확인하세요.` 분기에는 도달하지 못한다.

### R-030 규칙 기반 자동 분류와 유사 업무
layer: supporting
status: current
evidence:
- server.js:43 ~ path==='/api/automation'
- public/kpi-model.js:17-20 ~ const keywords=
- public/app.js:69 ~ id="accept-category"
- public/index.html:4 ~ id="automate-request"
- web/src/automation/adapter/in/web/routes.ts:29 ~ pattern: '/api/automation'
- web/src/automation/adapter/in/web/automation.scenario.spec.ts:1 ~ // R-030
- web/src/automation/adapter/in/web/automation.parity.spec.ts:1 ~ // R-030
- web/src/automation/application/service/SuggestForRequestService.spec.ts:1 ~ // R-030
- web/src/automation/domain/automation.spec.ts:1 ~ // R-030
golden:
test-name:
- 무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
accept:
- Given 업무 제목·내용에 장비·구매·시설·계약·복지 같은 키워드 / When 자동 분류를 요청하면 / Then 설정된 분류 중 키워드에 맞는 분류가 있으면 그 분류를 제안한다
- Given 맞는 키워드가 없는 내용 / When 자동 분류를 요청하면 / Then 설정된 분류의 첫 항목을 제안하고 직접 확인하라는 사유를 붙인다
- Given 비슷한 업무가 이미 있는 상태 / When 유사 업무를 구하면 / Then 삭제·테스트 업무는 빼고 유사도가 높은 순으로 돌려준다

제안은 담당자가 `분류 적용` 을 눌러야 등록 폼에 들어간다(`public/app.js` 의 `accept-category`). 유사도 10% 미만은 빼고 최대 5건이다(`public/kpi-model.js` 의 `similarTasks`, 한도 값은 시험이 보지 않는다). 응답의 `method` 에 생성형 AI 를 쓰지 않는다고 밝힌다(`server.js` 의 `/api/automation`). 요청은 POST 라 조회 계정은 쓰지 못한다(R-007).

### R-031 등록 업무의 감사 가능한 정보 정정
layer: core
status: current
evidence:
- public/task-editor.js:2-10 ~ export function editTask
- public/app.js:30-35 ~ async function detail(id)
- local-store.js:26-29 ~ edit_revision
- supabase/edit.sql:3-28 ~ create or replace function public.orbit_edit_task
- test/task-edit.test.js:12-20 ~ for(const status of
- web/src/request/adapter/in/web/lifecycle.parity.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/lifecycleSchemas.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/application/service/LifecycleServices.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/domain/TaskEdit.spec.ts:1 ~ // R-031 R-026 R-027
- web/src/request/adapter/in/web/routes.ts:16 ~ /edit$/
- web/src/request/domain/TaskEdit.ts:1 ~ (R-031)
golden:
test-name:
- 업무 수정: 모든 상태·권한·원본시각 보존·감사·충돌·유효성·삭제 업무 차단
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
- [R-031] an edit that changes nothing answers unchanged and adds no history row or revision
- [R-031] reason boundary: empty, whitespace-only and 1001 chars get 400; 1 and 1000 chars are accepted and stored in the audit row
accept:
- Given 관리자와 휴지통에 없는 등록 업무 / When 요청자·기한 등 허용된 항목을 수정 사유와 최신 수정 버전으로 저장하면 / Then 등록·완료 시각과 상태는 유지되고 변경 전후 값·사유·admin 계정·시각이 업무 이력에 남는다
- Given 조회 계정 또는 휴지통의 업무 / When 정보 수정을 요청하면 / Then 각각 403 또는 409로 거절한다
- Given 다른 화면에서 이미 수정한 업무 / When 낡은 수정 버전으로 저장하면 / Then 409로 거절하고 먼저 저장한 값을 보존한다
- Given 완료된 업무 / When 요청 시각을 완료 시각보다 뒤로 바꾸면 / Then 400으로 거절한다

정정 대상은 업무명·요청자·부서·접수 경로·유형·중요도·요청 시각·기한·상세내용이다. 상태·등록 시각·완료 시각·배정·첨부는 정정 요청으로 덮어쓰지 않는다. 바뀐 값이 없으면 이력을 추가하지 않고 수정 버전도 올리지 않는다. 기한과 요청 시각 정정은 현재 지표에 반영되지만 발행본은 유지한다. 이 동작은 새 저장소 규칙을 통합하기 전에 구현·검증된 기존 포털 변경으로, 이번 직접 배포 승인 과정에서는 새 Next 앱으로 이식하지 않는다.

### R-032 회사 브랜딩과 개요 업무 필드의 의미 표시
layer: supporting
status: current
evidence:
- public/settings-model.js:10-11 ~ const old={portalName:'orbit.ops'
- public/settings-model.js:2 ~ ['portalName','포털 이름','아이지넷']
- public/app.js:22 ~ task-row--labeled
- public/index.html:1-3 ~ <title>아이지넷
- frontend/src/report-pdf.js:15-16 ~ options.portalName||'아이지넷'
- web/src/app/site.ts:1 ~ SITE_TITLE = "아이지넷"
golden:
test-name:
- [R-032] 회사명 기본값과 저장된 이전 브랜딩은 갱신하고 사용자 설정은 보존
- [R-032] 개요 업무의 상태·기한 라벨, 미지정 표시와 모바일 배치를 확인
accept:
- Given 초기 또는 기존 기본 브랜딩 설정 / When 포털을 열면 / Then 아이지넷 회사명으로 표시하고 새 화면과 PDF 생성자에서 이전 플랫폼 이름을 제거한다
- Given 개요 화면의 처리할 업무 / When 상태와 기한을 표시하면 / Then 업무 상태와 처리 기한 라벨을 각 값에 연결하고 기한이 없는 경우 미지정으로 표시한다
- Given 관리자가 지정한 고유 문구와 이미지 / When 브랜딩을 갱신하면 / Then 기존 업무와 사용자 지정 내용은 보존하고 이전 기본 브랜딩 표기만 화면에서 변환한다

공식 이미지 파일은 저장소에 없고 사용자 승인에 따라 회사명 워드마크와 AI 이니셜을 사용한다. 과거 이력이나 업무 본문을 DB에서 다시 쓰지 않는다. 화면 설정의 이전 기본 표기는 읽을 때 변환하며 사용자 지정 이미지와 고유 문구는 보존한다.

### R-033 고정 분류와 날짜 중심 업무 조작
layer: supporting
status: current
home: legacy — 기존 포털에 이미 구현된 기능이라 이식 전까지 기존 파일이 소유한다
evidence:
- public/task-dates.js:1-2
- public/settings-model.js:7
- public/app.js:32-42
- frontend/src/Board.svelte:1-24
- web/src/board/domain/boardFacts.spec.ts:3 ~ // R-033
- web/src/board/domain/groupTasks.spec.ts:2 ~ // R-033
- web/src/shared/domain/categories.spec.ts:1 ~ // R-033
- web/src/shared/domain/kstDates.spec.ts:1 ~ // R-033
golden:
test-name:
- [R-033] 기존 설정에도 고정업무를 제공하고 날짜 그룹은 KST 경계·기간·미완료를 구분
- [R-033] 날짜 입력은 KST 자정으로 저장하고 기존 같은 날짜의 시각은 보존
- [R-033] 고정업무 날짜 등록·날짜 검색·성공 시 팝업 종료·실패 시 유지
accept:
- Given 새 업무 등록 / When 업무 분류를 선택하면 / Then 고정업무를 선택할 수 있다
- Given 업무 보드 / When 날짜별 묶음과 기간을 선택하면 / Then 한국 시간의 요청일·완료일·등록일로 업무를 찾고 최신 날짜부터 확인한다
- Given 등록 또는 수정 화면 / When 요청일을 입력하면 / Then 시간 입력 없이 날짜만 받고 기존 날짜를 수정하지 않으면 기존 시각을 보존한다
- Given 업무 상세 상태 변경 / When 저장이 성공하면 / Then 목록을 갱신하고 상세 팝업을 닫으며 실패하면 팝업을 유지한다

고정업무는 반복 일정 생성 기능이 아니라 등록 시 선택할 업무 분류다. 관리자 선택지 자체를 DB에서 다시 쓰지 않고 등록·수정 목록에 추가해 기존 설정도 지원한다. 새 요청이나 날짜를 바꾼 경우는 한국 시간 자정으로 저장하며 경과시간 안내에 그 기준을 명시한다. 같은 날짜를 유지한 수정은 기존 시각을 보존한다. 감사 기록의 실제 등록·변경 시각은 계속 자동 기록한다.

### R-034 완료 처리일 중심 기본 날짜 묶음
layer: supporting
status: current
home: legacy — 기존 포털에 이미 구현된 기능이라 이식 전까지 기존 파일이 소유한다
evidence:
- frontend/src/board/format.js:10-16
- frontend/src/Board.svelte:6-20
- web/src/board/domain/boardFacts.spec.ts:4 ~ // R-034
- web/src/board/domain/groupTasks.spec.ts:3 ~ // R-034
golden:
test-name:
- [R-034] 완료 업무는 한국 완료일로 이동하고 재개 업무는 요청일로 돌아온다
accept:
- Given 어제 요청하고 오늘 완료한 업무 / When 기본 날짜별 보드를 보면 / Then 한국 시간의 오늘 완료일 그룹과 기간 검색에 포함된다
- Given 미완료 또는 재개한 업무 / When 기본 날짜별 보드를 보면 / Then 요청일을 사용하고 완료일이 누락된 완료 업무는 완료일 미상으로 구분한다
- Given 요청일이나 등록일을 직접 선택 / When 날짜별 보드를 보면 / Then 선택한 기준을 유지한다
