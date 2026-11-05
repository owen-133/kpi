# 요구사항 정본

이 파일은 총무 업무 포털(orbit.ops)의 요구사항을 소유하는 유일한 자리다. 요구사항마다 증거(코드 줄)·골든 기록·테스트 이름·인수 조건을 한 곳에 묶는다. 다른 문서는 이 파일을 가리키기만 하고 요구사항을 다시 적지 않는다. `web/src/ssot.helpers.ts` 가 이 파일의 형식과 증거를 검사한다. `README.md` 는 제품 설명 문서이고 제목 재서술 검사의 대상이 아니다.

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
evidence:
- server.js:35-40
- server.js:28
- public/kpi-model.js:3
- local-store.js:34
- supabase/deletion.sql:23-28
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
- golden: legacy portal pages and API responses are unchanged
accept:
- Given 관리자로 로그인한 상태 / When 제목·요청자·요청 시각을 담아 업무를 등록하면 / Then 201 과 새 업무 id 가 돌아오고 상태는 접수다
- Given 관리자로 로그인한 상태 / When 제목이나 요청자가 비었거나 요청 시각이 날짜로 읽히지 않으면 / Then 400 으로 거절한다

등록 입력은 앞뒤 공백을 지우고 항목마다 10000자를 넘으면 400(`server.js:36`), 요청 본문이 1600000자를 넘으면 413(`server.js:28`), JSON 객체가 아니면 400 이다. 기한은 있으면 `YYYY-MM-DD` 형식의 실제 달력 날짜여야 한다. 등록은 변경 이력에 `등록` 한 줄을 남긴다. golden `create-too-long-body` 는 한 항목이 64100자인 본문이라 413 이 아니라 항목 길이 400 을 고정한다. 413 경로를 직접 검사하는 시험은 없다.

### R-002 업무 상태 전환
layer: core
status: current
evidence:
- server.js:16
- server.js:60
- local-store.js:35
- supabase/schema.sql:9
- supabase/deletion.sql:40-46
golden:
- secured/status-invalid
- secured/status-unknown-task
- secured/status-to-in-progress
- secured/status-to-waiting
- secured/status-to-done
- secured/status-same-noop
- secured/bad-json-status
test-name:
- golden: legacy portal pages and API responses are unchanged
accept:
- Given 접수 상태의 업무 / When 상태를 진행 중으로 바꾸면 / Then 200 이고 변경 이력에 `접수 → 진행 중` 이 남는다
- Given 진행 중 상태의 업무 / When 같은 상태 진행 중으로 바꾸면 / Then 200 을 돌려주되 상태와 변경 이력은 그대로다

상태는 접수·진행 중·대기·완료 넷이다. 이 밖의 값은 400, 없는 업무는 404 다. 같은 상태로 바꾸는 요청은 오류가 아니라 아무 일도 하지 않는 성공이다. 완료로 바뀔 때만 완료 시각이 기록되고, 완료에서 벗어나면 완료 시각이 비워진다. 휴지통에 있는 업무의 상태는 바꾸지 못한다(R-026).

### R-003 완료 업무 재개는 사유가 필요하다
layer: core
status: current
evidence:
- local-store.js:35
- server.js:60
- supabase/deletion.sql:44
- README.md:42
golden:
- secured/reopen-without-reason-400
- secured/reopen-reason-too-long
- secured/reopen-with-reason
test-name:
- 접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존
- golden: legacy portal pages and API responses are unchanged
accept:
- Given 완료 상태의 업무 / When 사유 없이 다른 상태로 바꾸면 / Then 400 으로 거절하고 상태는 완료 그대로다
- Given 완료 상태의 업무 / When 사유를 담아 다른 상태로 바꾸면 / Then 200 이고 변경 이력에 `완료 → 진행 중 · 사유` 가 남는다

사유는 앞뒤 공백을 지운 뒤 10000자를 넘으면 400 이다. 사유 요구는 현재 상태가 완료일 때만 걸린다.

### R-004 업무 메모 추가
layer: core
status: current
evidence:
- server.js:61
- local-store.js:36
- supabase/deletion.sql:47-49
- README.md:42
golden:
- secured/note-add
- secured/note-empty
- secured/note-too-long
- secured/note-unknown-task
- secured/same-origin-note
test-name:
- 접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존
accept:
- Given 등록된 업무 / When 메모를 보내면 / Then 201 이고 변경 이력에 `처리 메모` 가 남는다
- Given 등록된 업무 / When 빈 메모나 10000자를 넘는 메모를 보내면 / Then 400 으로 거절한다

업무 원문은 수정하지 않고 메모로 정정한다. 없는 업무와 휴지통에 있는 업무는 404 다.

### R-005 변경 이력은 추가만 되고 시각은 서버가 기록한다
layer: core
status: current
evidence:
- local-store.js:9-11
- local-store.js:25
- local-store.js:33
- supabase/schema.sql:12-22
- supabase/deletion.sql:8-14
- supabase/deletion.sql:38
- public/app.js:39
- README.md:42
- README.md:44
golden:
- secured/detail-after-flow
test-name:
- 접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존
accept:
- Given 등록·상태 변경·메모를 거친 업무 / When 상세를 조회하면 / Then 변경 이력이 발생 순서대로 `등록`·`상태 변경`·`처리 메모` 로 나온다
- Given 기록된 변경 이력 / When 수정이나 삭제를 시도하면 / Then 저장소가 거부한다

변경 이력의 시각은 서버(로컬은 `new Date()`, 클라우드는 DB 시계)가 기록한다. 등록·상태 변경·메모의 행위자는 `총무 담당자` 로 고정된다. 삭제·복원·배정·첨부 이력의 행위자는 로컬 저장소가 `총무 담당자`, 클라우드 DB 가 `admin` 이다(`supabase/deletion.sql:80`). 요청 시각만 사용자가 한국 시간으로 입력한다. 거부의 예외는 업무 영구 삭제 하나뿐이고, 그때 그 업무의 변경 이력이 함께 지워진다(R-027). DB 관리자 권한 소유자의 변경까지 막지는 못한다(`README.md:44`).

### R-006 업무 목록과 상세
layer: core
status: current
evidence:
- server.js:14
- server.js:34
- server.js:58
- local-store.js:32-33
- supabase/deletion.sql:21-22
- supabase/deletion.sql:36-39
golden:
- secured/list-empty
- secured/list-after-flow
- secured/detail-after-flow
- secured/detail-second-task
- secured/detail-unknown
- secured/detail-wrong-method-path
test-name:
- golden: legacy portal pages and API responses are unchanged
accept:
- Given 등록된 업무가 없는 상태 / When 목록을 조회하면 / Then 빈 목록이 돌아온다
- Given 업무가 여럿 등록된 상태 / When 목록을 조회하면 / Then 최근 등록한 업무가 먼저 나온다
- Given 없는 업무 id / When 상세를 조회하면 / Then 404 다

상세는 업무 항목에 변경 이력(`events`)을 발생 순서대로 붙이고, 휴지통에 없는 업무에는 담당자·첨부 정보(`kpi`)도 붙인다. 목록 항목은 `deleted_at` 열을 지니며 휴지통 업무는 목록에서 빠진다(R-026). 담당자 정보 행이 있는 업무의 목록 항목에는 `task_id`·`assignee`·`assigned_at`·`is_test` 가 더해진다(`server.js:14`). golden 은 담당자 정보 행이 없는 업무만 고정한다.

## 지원

### R-007 조회 계정은 아무것도 바꾸지 못한다
layer: supporting
status: current
evidence:
- server.js:26
- public/app.js:29
- public/app.js:40
- README.md:35
golden:
- secured/viewer-create-403
- secured/viewer-status-403
- secured/viewer-notes-403
- secured/viewer-put-403
- secured/viewer-list
- secured/session-viewer
test-name:
- 접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존
accept:
- Given 조회 계정(`viewer`)으로 로그인한 상태 / When GET 이 아닌 API 를 부르면 / Then 403 이고 아무것도 바뀌지 않는다
- Given 조회 계정으로 로그인한 상태 / When 목록을 조회하면 / Then 200 이다

조회 계정은 목록·상세·설정·첨부 내려받기·발행 이력을 읽는다. 휴지통·삭제 이력·설정 변경 이력은 조회 계정에도 403 이다(R-026, R-028). 목록 응답 항목은 `deleted_at` 열을 지닌다.

### R-008 Basic 로그인과 로컬 열린 모드
layer: supporting
status: current
evidence:
- server.js:18
- server.js:23
- server.js:24
- server.js:32
- public/app.js:22
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
- 접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존
accept:
- Given 관리자 비밀번호가 설정된 서버 / When 인증 없이 화면이나 API 를 부르면 / Then 401 과 Basic 인증 요구가 돌아온다
- Given 관리자 비밀번호가 없는 로컬 서버 / When 인증 없이 부르면 / Then 관리자로 통과하고 세션의 `shared` 는 false 다

`/health` 의 GET 만 인증 없이 열린다. 사용자는 `admin` 과 `viewer` 둘이다. 비밀번호 비교는 길이가 같을 때만 시간 일정 비교로 한다. 열린 모드에서는 화면에 로컬 개발 모드 안내가 뜬다.

### R-009 다른 출처의 변경 요청은 막는다
layer: supporting
status: current
evidence:
- server.js:27
golden:
- secured/cross-origin-create-403
- secured/cross-origin-status-403
- secured/cross-origin-get-allowed
- secured/same-origin-note
test-name:
- golden: legacy portal pages and API responses are unchanged
accept:
- Given 관리자로 로그인한 상태 / When `Origin` 이 서버 주소와 다른 POST 를 보내면 / Then 403 으로 거절한다
- Given 관리자로 로그인한 상태 / When `Origin` 이 다른 GET 을 보내면 / Then 200 으로 통과한다

### R-010 배포 설정이 없으면 서버가 뜨지 않는다
layer: supporting
status: current
evidence:
- server.js:8-11
- supabase-store.js:3-5
- README.md:34
- README.md:38
golden:
test-name:
- 배포 설정 누락 시 임시 디스크로 시작하지 않음
accept:
- Given `NODE_ENV=production` 이고 `STORAGE_BACKEND` 가 supabase 가 아닌 환경 / When 서버를 시작하면 / Then 오류로 종료한다
- Given 운영 또는 supabase 모드 / When 관리자나 조회 비밀번호가 없으면 / Then 오류로 종료한다

관리자와 조회 비밀번호가 같아도 시작하지 않는다. supabase 모드는 `SUPABASE_URL` 과 비밀 키가 있고 URL 이 `https://*.supabase.co` 루트일 때만 시작한다. 연결 오류가 나도 로컬 저장으로 바꾸지 않는다. 시험은 첫 조건(운영 환경에서 저장소가 supabase 가 아님)만 검사하고, 나머지는 코드 줄로만 뒷받침된다.

### R-011 업무 보드, 검색, 상태 필터
layer: supporting
status: current
evidence:
- frontend/src/board/format.js:9
- frontend/src/Board.svelte:15-16
- public/app.js:24
golden:
test-name:
- 검색과 상태를 함께 적용하고 부서별로 재분류
- 원본 대표 상태 우선순위로 분류하고 완료 기록도 유지
accept:
- Given 업무 보드 화면 / When 검색어를 입력하면 / Then 제목·요청자·부서·내용·담당자에 대소문자 구분 없이 검색어가 들어 있는 업무만 보인다
- Given 업무 보드 화면 / When 상태를 고르면 / Then 그 상태의 업무만 보인다

보드는 업무를 분류·부서·접수 경로 중 고른 기준으로 묶고, 묶음 안은 접수 → 진행 중 → 대기 → 완료 순, 같은 상태에서는 기한이 가까운 순이다. 묶고 거르는 계산(`format.js` 의 `groupsFor`)은 시험이 있다. 화면 그리기와 조회 계정의 읽기 전용 표시는 브라우저 시험(`test/board-ui.test.js`)이 보지만 그 시험은 `ORBIT_PLAYWRIGHT_PATH` 가 없으면 건너뛴다.

### R-012 CSV 내려받기
layer: supporting
status: current
evidence:
- public/app.js:35
- public/app.js:24
- frontend/src/Board.svelte:16
golden:
- secured/static-app-js-admin
test-name:
accept:
- Given 업무 보드 화면 / When CSV 내려받기를 누르면 / Then 업무, 요청자, 부서, 접수 경로, 분류, 상태, 요청 시각, 등록 시각, 완료 시각 열의 `총무업무_날짜.csv` 가 내려온다

파일은 BOM 이 붙은 UTF-8 이고, 셀이 `=`·`+`·`@`·`-` 로 시작하면 앞에 `'` 를 붙여 수식으로 읽히지 않게 한다. 내려받는 목록은 화면 필터와 무관하게 휴지통을 뺀 전체 업무이고 테스트 업무(R-021)도 들어 있다.

화면 동작 자체를 검사하는 시험은 없다. golden 은 `public/app.js` 바이트가 그대로인지만 고정한다(동작은 리뷰에서 본다).

### R-013 누적 실적과 소요 시간
layer: supporting
status: current
evidence:
- public/app.js:13
- public/app.js:18
- public/app.js:19
- public/app.js:65
- public/app.js:69
- public/kpi-model.js:12
- README.md:42
golden:
- secured/static-app-js-admin
test-name:
accept:
- Given 업무가 여럿 쌓인 상태 / When 대시보드 위쪽 통계를 보면 / Then 전체 업무는 휴지통·테스트 업무를 뺀 누적 접수 건수, 진행 중·완료 업무는 같은 범위의 현재 상태 건수, 기한 초과는 기한이 오늘(한국 시간)보다 앞서면서 완료가 아닌 건수다
- Given 이번 달에 완료된 업무가 있는 상태 / When 대시보드의 이번 달 운영 지표를 보면 / Then 평균 경과는 그 업무들의 요청 시각부터 완료 시각까지 달력 시간(대기·주말 포함)을 시간 단위로 평균한 값이다

통계는 누적 기준이다. 소요 시간은 현재 완료 상태인 업무만 센다. 재개하면 완료 시각이 비워지므로 그 업무는 다시 완료될 때까지 빠진다. 평균 경과는 월간 지표(R-022)와 같은 계산이다. 대시보드는 활성 화면에서 30초마다 목록을 다시 불러온다(`public/app.js:69`).

화면 동작 자체를 검사하는 시험은 없다. golden 은 `public/app.js` 바이트가 그대로인지만 고정한다(동작은 리뷰에서 본다). 월간 계산은 R-022 의 시험이 본다.

### R-014 웹 골격의 Request 예시
layer: supporting
status: current
evidence:
- web/src/request/domain/Request.ts:38
- web/src/request/domain/Request.ts:65-79
- web/src/request/domain/Request.ts:114-138
- web/src/request/domain/RequestStatus.ts:1
- web/src/request/domain/RequestStatus.ts:9-11
golden:
test-name:
- register trims title and requester and starts as received
- changeStatus to the same status throws and changes nothing
- reopening a finished request without a reason throws and keeps it finished
accept:
- Given 새로 등록한 Request / When 상태를 보면 / Then received 이고 변경 이력 첫 줄이 남아 있다
- Given done 이나 rejected 상태의 Request / When 사유 없이 다른 상태로 바꾸면 / Then 오류를 던지고 상태는 그대로다

새 앱의 `Request` 는 기존 포털과 다르다. 상태는 received·inProgress·done·rejected 넷이고(`RequestStatus.ts:1`), 같은 상태로 바꾸면 오류를 던진다(`Request.ts:118-120`). 기존 포털은 접수·진행 중·대기·완료 넷이고 같은 상태 변경을 아무 일도 하지 않는 성공으로 다룬다(R-002). 재개 사유는 새 앱이 done·rejected 에서 벗어날 때, 기존 포털이 완료에서 벗어날 때 요구한다. 어느 쪽으로 맞출지는 이식할 때 정하고, 정하기 전까지 이식하는 동작은 기존 포털 동작이 이긴다.

## 후속 기능

### R-015 첨부파일
layer: supporting
status: current
evidence:
- server.js:49-53
- kpi-store-local.js:21-23
- supabase/kpi.sql:3
- supabase/kpi.sql:45-55
- public/kpi-ui.js:38
- public/kpi-ui.js:41-42
golden:
test-name:
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 관리자가 연 업무 / When 허용 확장자(pdf·png·jpg·jpeg·webp·txt·csv·xlsx·docx)의 1MB 이하 파일을 올리면 / Then 201 과 파일 id 가 돌아오고 업무 이력에 `첨부파일 등록` 이 남는다
- Given 허용하지 않는 확장자(`.html`)의 파일 / When 올리면 / Then 400 으로 거절한다
- Given 조회 계정 / When 첨부를 내려받으면 / Then 내용이 같은 파일이 `attachment` 헤더로 내려오고, 올리기나 삭제는 403 이다
- Given 첨부가 달린 업무 / When 그 업무를 영구 삭제하면 / Then 첨부파일도 함께 사라진다

첨부는 DB 행으로 저장하며 파일당 1MB, 업무당 10개다(`kpi-store-local.js:21`, `supabase/kpi.sql:46-47`). 삭제는 업무 이력에 `첨부파일 삭제` 를 남긴다. `첨부파일 등록` 이력 기록과 업무당 10개·1MB 한도는 코드 줄로만 뒷받침되고 시험은 없다. 클라우드 경로는 `ORBIT_PGLITE_PATH` 가 있을 때만 도는 시험이 본다.

### R-016 팀장 확인과 댓글
layer: out
status: planned
evidence:
- README.md:44

서버 라우트(`server.js:29-61`)에 팀장 확인이나 댓글 경로가 없다.

### R-017 월별 기간 필터
layer: supporting
status: current
evidence:
- public/kpi-ui.js:3
- public/kpi-ui.js:13
- public/kpi-ui.js:14
- server.js:46
- public/kpi-model.js:6-9
golden:
test-name:
- KST 월 경계·기한 날짜·분모·테스트·삭제·잘못된 시각·중앙값
accept:
- Given 여러 달에 걸쳐 접수·완료된 업무 / When 업무 실적 화면에서 조회 월을 고르면 / Then 그 달(한국 시간)에 요청받은 업무와 그 달에 완료된 업무만 지표에 집계된다
- Given `YYYY-MM` 형식이 아니거나 없는 달(`2026-13`) / When 그 월로 지표를 요청하면 / Then 400 `조회 월을 확인하세요.` 로 거절한다

기간 필터는 업무 실적 화면의 월 입력 하나다. 기본값은 현재 월이고(`kpi-ui.js:3`), 업무 보드·목록·CSV 에는 기간 필터가 없다(필터는 검색어와 상태뿐이다, R-011). 월 경계 계산과 잘못된 월의 예외는 모델 시험이 본다. 월 입력 칸 조작은 브라우저 시험에도 없고, 서버가 그 예외를 400 으로 바꾸는 줄(`server.js:46`)도 시험이 없다.

### R-018 AI 요약
layer: out
status: planned
evidence:
- README.md:44

규칙 기반 자동 초안(R-023)과 자동 분류(R-030)는 생성형 AI 요약이 아니다. `server.js` 에는 외부 AI 호출이 없다.

### R-019 개인별 인증
layer: out
status: planned
evidence:
- README.md:35
- README.md:44

공용 `admin`·`viewer` 비밀번호만 있고 개인별 계정은 없다(`server.js:18`).

## 확장 기능

### R-020 담당자 배정과 최초 배정 시각
layer: core
status: current
evidence:
- server.js:55
- server.js:14
- kpi-store-local.js:14
- kpi-store-local.js:20
- supabase/kpi.sql:41-44
- public/kpi-ui.js:38
- public/kpi-ui.js:40
- frontend/src/board/TaskRow.svelte:9
golden:
test-name:
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 등록된 업무 / When 관리자가 담당자 이름을 1~100자로 배정하면 / Then 200 이고 상세에 최초 배정 시각이 기록되며 목록의 담당자가 그 이름이다
- Given 이미 배정된 업무 / When 다른 담당자로 다시 배정하면 / Then 담당자는 바뀌지만 최초 배정 시각은 처음 값 그대로다
- Given 조회 계정 / When 배정을 보내면 / Then 403 이다

담당자 이름이 비었거나 100자를 넘으면 400 이다(`server.js:55`, 시험 없음). 휴지통의 업무는 배정할 수 없다. 변경 이력 `담당자 배정` 의 상세는 로컬이 `이전 담당자 → 새 담당자`(`kpi-store-local.js:20`), 클라우드 DB 가 새 담당자 이름만 남긴다(`supabase/kpi.sql:44`). 보드의 업무 행에는 `담당 <이름>` 또는 `담당 미배정` 이 보인다.

### R-021 실제 업무와 테스트 업무 구분
layer: supporting
status: current
evidence:
- server.js:54
- kpi-store-local.js:19
- supabase/kpi.sql:38-40
- public/kpi-model.js:7
- public/kpi-model.js:20
- public/app.js:19
- public/kpi-ui.js:38-39
- frontend/src/board/TaskRow.svelte:9
golden:
test-name:
- KST 월 경계·기한 날짜·분모·테스트·삭제·잘못된 시각·중앙값
- 무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
accept:
- Given 완료된 실제 업무 / When 관리자가 테스트 업무로 바꾸면 / Then 월간 지표의 접수·완료에서 빠지고 변경 이력에 `데이터 구분 변경` 이 남는다
- Given 테스트 업무 / When 월간 지표와 유사 업무를 구하면 / Then 테스트 업무는 지표에 세지 않고 `excludedTests` 로만 센다
- Given 구분 값이 참·거짓이 아닌 요청 / When 구분을 바꾸면 / Then 400 이다

담당자 정보 행이 없는 업무는 실제 업무다. 보드에서 테스트 업무는 제목 앞에 `[테스트]` 가 붙는다. 대시보드 통계(R-013)도 테스트 업무를 뺀다. 이력 문구와 400 줄은 시험이 직접 보지 않는다.

### R-022 월별 운영 지표 집계
layer: supporting
status: current
evidence:
- public/kpi-model.js:5-15
- server.js:46
- public/kpi-ui.js:7
- public/kpi-ui.js:13
- public/kpi-ui.js:16
- public/app.js:65
golden:
test-name:
- KST 월 경계·기한 날짜·분모·테스트·삭제·잘못된 시각·중앙값
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
accept:
- Given 여러 달에 걸친 업무 / When 월을 정해 집계하면 / Then 접수는 요청 시각이 그 달인 업무 수, 완료는 현재 완료 상태이고 완료 시각이 그 달인 업무 수이며 삭제·테스트 업무와 완료 시각이 요청보다 빠른 업무는 세지 않는다
- Given 기한이 있는 완료 업무와 기한 없는 완료 업무 / When 집계하면 / Then 완료 기준 준수율은 기한 있는 완료 건을 분모로, 완료 날짜가 기한 날짜 이내인 건을 분자로 소수 첫째 자리까지 구하고 분모가 0 이면 값이 비어 있다
- Given 선택월에 기한이 있는 업무 / When 집계하면 / Then 기한 도래 기준 준수율은 오늘까지 기한이 도래한 업무(미완료 포함)를 분모로 기한 내 완료한 건을 분자로 구한다
- Given 완료 업무가 있는 달 / When 집계하면 / Then 평균·중앙값은 요청부터 완료까지 달력 시간(대기·주말 포함)을 시간 단위로 구하고 대상이 없으면 값이 비어 있다

날짜와 월 경계는 한국 시간이다. 잘못된 시각·기한을 가진 업무는 `invalid` 로 따로 센다. 집계는 현재 상태 기준이라 과거 월말 상태를 복원한 수치가 아니다. 업무 실적 화면은 위 값을 카드로 보이고 지표 CSV(`지표,값` 두 열)로 내려받을 수 있다. 월간 접수·완료·평균 경과는 대시보드의 이번 달 카드에도 쓰인다. 집계 계산은 시험이 보고, 화면과 CSV 내려받기는 브라우저 시험이 있지만 Playwright 가 있을 때만 돈다.

### R-023 월간 보고서 초안과 발행
layer: supporting
status: current
evidence:
- server.js:15
- server.js:46-48
- public/kpi-model.js:16
- kpi-store-local.js:27-28
- kpi-store-local.js:10-11
- supabase/kpi.sql:6
- supabase/kpi.sql:14-15
- supabase/kpi.sql:30-31
- public/kpi-ui.js:13
- public/kpi-ui.js:20
golden:
test-name:
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
- KST 월 경계·기한 날짜·분모·테스트·삭제·잘못된 시각·중앙값
accept:
- Given 월간 지표를 집계한 화면 / When 관리자가 검토한 문안으로 발행하면 / Then 201 이고 그 시점의 집계값과 문안이 발행 이력에 보존된다
- Given 집계한 뒤 업무가 바뀐 상태 / When 처음 집계의 지문으로 발행하면 / Then 409 로 거절하고 새로 집계해야 한다
- Given 조회 계정 / When 발행하면 / Then 403 이고 발행 이력은 읽을 수 있다
- Given 발행본이 있는 상태 / When 그 발행본의 원 업무를 영구 삭제하면 / Then 발행본은 그대로 남고 저장소가 발행본의 수정·삭제를 거부한다

초안은 집계값을 채운 규칙 기반 문안이고 생성형 AI 를 쓰지 않는다. 발행 요청에 문안(`draft`)이 없으면 규칙 기반 초안이 발행된다(`server.js:48`). 같은 월을 다시 발행하면 발행본이 별도 버전으로 쌓인다. 미래 월 발행과 20000자를 넘는 문안은 400 이다(`server.js:48`, 시험 없음). 발행본 문안이 저장되어 다시 읽히는지는 클라우드 시험(`ORBIT_PGLITE_PATH` 필요)만 본다.

### R-024 발행본 PDF 내려받기
layer: supporting
status: current
evidence:
- public/kpi-ui.js:18
- frontend/src/report-pdf.js:10-43
- server.js:65
golden:
test-name:
- PDF: 한글·A4·원시 집계값 제외·긴 문안 페이지 나눔
- KPI 브라우저: 추천·배정·첨부·월간 보고서·개선 관리대장·조회 계정
accept:
- Given 발행 이력에 발행본이 있는 상태 / When 발행본 내려받기를 누르면 / Then 한글 글꼴을 포함한 A4 PDF 가 `<월>_월간처리현황_<발행본 id 앞 8자>.pdf` 로 내려온다
- Given 여러 쪽 분량의 문안 / When PDF 를 만들면 / Then 쪽이 나뉘고 쪽마다 `현재쪽 / 전체쪽` 번호가 붙는다
- Given 집계값이 담긴 발행본 / When PDF 를 만들면 / Then 문안만 그려지고 원시 집계값은 들어가지 않는다

PDF 는 브라우저가 만든다. 서버는 스크립트(`/pdf/report-pdf.js`)와 글꼴(`/fonts/NanumGothic-Regular.ttf`)만 내준다. 글꼴에 없는 글자는 `□` 로 그린다(`frontend/src/report-pdf.js:14`). 두 시험은 기본 실행에서 건너뛴다. PDF 시험은 `ORBIT_PDF_CHECK` 와 `pdfinfo`·`pdftotext` 가 있을 때, 브라우저 시험은 Playwright 가 있을 때 돈다.

### R-025 개선 이력 관리대장
layer: supporting
status: current
evidence:
- server.js:43-45
- public/kpi-model.js:21
- kpi-store-local.js:5-6
- kpi-store-local.js:8-9
- kpi-store-local.js:24-26
- supabase/kpi.sql:4-5
- supabase/kpi.sql:12-13
- supabase/kpi.sql:22-29
- public/kpi-ui.js:22-33
golden:
test-name:
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
- 무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 관리자 / When 개선 제목·피드백·단계·상태를 담아 저장하면 / Then 201 이고 새 개선 항목이 생기며 저장 전후 값이 수정 이력에 남는다
- Given 이미 수정된 개선 항목 / When 낡은 버전 번호로 저장하면 / Then 409 로 거절한다
- Given 상태가 검증 완료인데 검증 결과가 비었다 / When 저장하면 / Then 거절한다
- Given 조회 계정 / When 개선 항목을 저장하면 / Then 403 이고 목록·수정 이력은 읽을 수 있다

단계는 `MVP 구축`·`본인 실사용`·`정착 운영`, 상태는 `접수`·`개선 중`·`검증 완료` 이고 항목별 5000자를 넘으면 거절한다(`public/kpi-model.js:21`). 검증 결과 거절은 모델 시험이 보고 400 으로 바꾸는 줄(`server.js:44`)은 시험이 없다. 개선 항목 목록은 CSV 로 내려받을 수 있다(`public/kpi-ui.js:32`, 시험 없음).

### R-026 업무 삭제와 복원(휴지통)
layer: core
status: current
evidence:
- server.js:33
- server.js:56
- server.js:58-59
- local-store.js:22-24
- local-store.js:27
- local-store.js:32-33
- local-store.js:35-36
- supabase/deletion.sql:21-22
- supabase/deletion.sql:36
- supabase/deletion.sql:62
- supabase/deletion.sql:68-69
- supabase/deletion.sql:79-80
- public/app.js:32
- public/app.js:55-60
golden:
test-name:
- 모든 상태 삭제·조회 차단·복원·제목 확인 후 영구 삭제 및 최소 감사 기록
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 어떤 상태든 업무 / When 관리자가 사유를 담아 삭제하면 / Then 200 이고 업무가 목록에서 빠지며 상태 변경이 409 로 막힌다
- Given 사유가 빈 삭제 요청 / When 보내면 / Then 400 으로 거절한다
- Given 휴지통의 업무 / When 조회 계정이 휴지통·삭제 이력·삭제된 업무 상세를 부르면 / Then 403 또는 404 다
- Given 휴지통의 업무 / When 관리자가 사유를 담아 복원하면 / Then 200 이고 삭제 전 상태 그대로 목록에 돌아온다

사유는 앞뒤 공백을 지운 뒤 1~1000자여야 한다(`server.js:59`). 이미 휴지통에 있는 업무의 삭제와 휴지통에 없는 업무의 복원은 409 다. 삭제와 복원은 업무 이력에 `업무 삭제`·`업무 복원` 을 남긴다(`local-store.js:24`, `supabase/deletion.sql:80`). 복원이 완료 시각과 처리 이력을 그대로 두는지는 시험이 상태만 본다. 휴지통 업무는 목록·통계·CSV·월간 지표에서 빠지고 담당자·첨부도 바꾸지 못한다(`kpi-store-local.js:14`, `public/kpi-ui.js:36`).

### R-027 제목 확인 후 영구 삭제와 삭제 이력
layer: core
status: current
evidence:
- server.js:59
- local-store.js:19-21
- local-store.js:22-24
- local-store.js:27
- kpi-store-local.js:3-4
- supabase/deletion.sql:3-6
- supabase/deletion.sql:15-16
- supabase/deletion.sql:63
- supabase/deletion.sql:70-77
- supabase/kpi.sql:2-3
- public/app.js:60-61
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

삭제 이력 조회는 최근 100건이고 관리자만 본다(`local-store.js:27`, `supabase/deletion.sql:63`). 이력 행에는 업무 제목·본문을 복제하지 않는다(로컬은 제목 열에 고정 문구를 넣고 `local-store.js:23`, 클라우드 표에는 제목 열이 없다 `supabase/deletion.sql:3-6`). 영구 삭제는 처리 이력 보호의 유일한 예외로, 로컬은 삭제 트리거를 잠시 내리고(`local-store.js:24`) 클라우드는 업무별 허용 설정을 쓴다(`supabase/deletion.sql:11`). 이미 발행한 월간 보고서는 영구 삭제의 영향을 받지 않는다(R-023). 사람 개인은 식별하지 않고 공용 `admin` 이 기록된다.

### R-028 관리자 공통 설정과 변경 이력
layer: supporting
status: current
evidence:
- server.js:29-31
- local-store.js:13-17
- local-store.js:29-31
- supabase/settings.sql:2-14
- supabase/settings.sql:25-33
- public/admin-settings.js:3-18
- public/settings-model.js:7-8
- public/app.js:38
- public/app.js:40
- public/app.js:42-52
golden:
test-name:
- 설정 API 권한·버전 충돌·이력과 재시작 후 공통 설정 보존
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 조회 계정 / When 설정을 저장하거나 설정 변경 이력을 조회하면 / Then 403 이고 설정 값 읽기는 200 이다
- Given 관리자 / When 최신 버전 번호로 설정을 저장하면 / Then 200 이고 버전이 1 오르며 수정 전후 값이 `admin` 으로 변경 이력에 남는다
- Given 이미 저장되어 버전이 오른 설정 / When 낡은 버전 번호로 저장하면 / Then 409 로 거절한다
- Given 저장된 공통 설정 / When 서버를 다시 시작하면 / Then 모든 계정이 같은 설정을 읽는다

설정은 포털 문구·메뉴·배너·업무 분류/접수 경로/우선순위 선택 항목·이미지 로고·색상이다. 상태 단계와 보안 설정은 설정 대상이 아니다(`public/settings-model.js:7-12`, 정의에 없는 필드는 거절한다). 선택 항목을 바꿔도 기존 업무의 값은 그대로다. 변경 이력은 최근 30건이다(`local-store.js:30`). 설정 DB 가 준비되지 않은 클라우드에서는 기본값과 안내를 돌려준다(`server.js:29`, 시험 없음). 설정 창의 화면 동작은 브라우저 시험(`test/board-ui.test.js`)이 있지만 Playwright 가 있을 때만 돈다.

### R-029 설정 값 검증
layer: supporting
status: current
evidence:
- public/settings-model.js:9-21
- server.js:31
- server.js:67
golden:
test-name:
- 설정 입력 검증: 색상·이미지·중복·빈 항목·임의 필드 차단
accept:
- Given 분류 목록이 비었거나 같은 항목이 두 번 있는 설정 / When 검증하면 / Then 오류를 던진다
- Given `#rrggbb` 형식이 아닌 색상, PNG·JPEG·WebP 가 아닌 로고, 정의에 없는 필드 / When 검증하면 / Then 오류를 던진다
- Given 마크업이 들어 있는 문구 / When 검증하면 / Then 글자 그대로 통과한다

문구는 항목마다 1~1000자, 선택 항목은 1~30개에 항목당 1~50자, 로고는 PNG·JPEG·WebP 데이터 URL 이고 280000자 이하다. 검증 예외의 `status` 400 을 서버가 응답으로 바꾸는 줄(`server.js:67`)과 마크업 문구를 화면에서 이스케이프하는 줄은 모델 시험이 보지 않는다.

### R-030 규칙 기반 자동 분류와 유사 업무
layer: supporting
status: current
evidence:
- server.js:42
- public/kpi-model.js:17-20
- public/app.js:66
- public/index.html:4
golden:
test-name:
- 무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외
- 배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동
accept:
- Given 업무 제목·내용에 장비·구매·시설·계약·복지 같은 키워드 / When 자동 분류를 요청하면 / Then 설정된 분류 중 키워드에 맞는 분류가 있으면 그 분류를 제안한다
- Given 맞는 키워드가 없는 내용 / When 자동 분류를 요청하면 / Then 설정된 분류의 첫 항목을 제안하고 직접 확인하라는 사유를 붙인다
- Given 비슷한 업무가 이미 있는 상태 / When 유사 업무를 구하면 / Then 삭제·테스트 업무는 빼고 유사도가 높은 순으로 돌려준다

제안은 담당자가 `분류 적용` 을 눌러야 등록 폼에 들어간다(`public/app.js:66`). 유사도 10% 미만은 빼고 최대 5건이다(`public/kpi-model.js:20`, 한도 값은 시험이 보지 않는다). 응답의 `method` 에 생성형 AI 를 쓰지 않는다고 밝힌다(`server.js:42`). 요청은 POST 라 조회 계정은 쓰지 못한다(R-007).

### R-031 등록 업무의 감사 가능한 정보 정정
layer: core
status: current
evidence:
- public/task-editor.js:2-10
- public/app.js:30-35
- local-store.js:26-29
- supabase/edit.sql:1-29
- test/task-edit.test.js:12-20
golden:
test-name:
- 업무 수정: 모든 상태·권한·원본시각 보존·감사·충돌·유효성·삭제 업무 차단
- PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존
accept:
- Given 관리자와 휴지통에 없는 등록 업무 / When 요청자·기한 등 허용된 항목을 수정 사유와 최신 수정 버전으로 저장하면 / Then 등록·완료 시각과 상태는 유지되고 변경 전후 값·사유·admin 계정·시각이 업무 이력에 남는다
- Given 조회 계정 또는 휴지통의 업무 / When 정보 수정을 요청하면 / Then 각각 403 또는 409로 거절한다
- Given 다른 화면에서 이미 수정한 업무 / When 낡은 수정 버전으로 저장하면 / Then 409로 거절하고 먼저 저장한 값을 보존한다
- Given 완료된 업무 / When 요청 시각을 완료 시각보다 뒤로 바꾸면 / Then 400으로 거절한다

정정 대상은 업무명·요청자·부서·접수 경로·유형·중요도·요청 시각·기한·상세내용이다. 상태·등록 시각·완료 시각·배정·첨부는 정정 요청으로 덮어쓰지 않는다. 바뀐 값이 없으면 이력을 추가하지 않는다. 기한과 요청 시각 정정은 현재 지표에 반영되지만 발행본은 유지한다. 이 동작은 새 저장소 규칙을 통합하기 전에 구현·검증된 기존 포털 변경으로, 이번 직접 배포 승인 과정에서는 새 Next 앱으로 이식하지 않는다.
