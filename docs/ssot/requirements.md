# 요구사항 정본

이 파일은 총무 업무 포털(orbit.ops)의 요구사항을 소유하는 유일한 자리다. 요구사항마다 증거(코드 줄)·골든 기록·테스트 이름·인수 조건을 한 곳에 묶는다. 다른 문서는 이 파일을 가리키기만 하고 요구사항을 다시 적지 않는다. `web/src/ssot.helpers.ts` 가 이 파일의 형식과 증거를 검사한다.

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
- server.js:26-31
- server.js:23
- local-store.js:18
- supabase/schema.sql:30-35
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

등록 입력은 앞뒤 공백을 지우고 항목마다 10000자를 넘으면 400, 본문이 64000자를 넘으면 413, JSON 객체가 아니면 400 이다. 기한은 있으면 `YYYY-MM-DD` 여야 한다. 등록은 변경 이력에 `등록` 한 줄을 남긴다.

### R-002 상태 변경
layer: core
status: current
evidence:
- server.js:11
- server.js:35
- local-store.js:19
- supabase/schema.sql:46-52
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

상태는 접수·진행 중·대기·완료 넷이다. 이 밖의 값은 400, 없는 업무는 404 다. 같은 상태로 바꾸는 요청은 오류가 아니라 아무 일도 하지 않는 성공이다. 완료로 바뀔 때만 완료 시각이 기록되고, 완료에서 벗어나면 완료 시각이 비워진다.

### R-003 완료 업무 재개는 사유가 필요하다
layer: core
status: current
evidence:
- local-store.js:19
- server.js:35
- supabase/schema.sql:50
- README.md:28
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

### R-004 처리 메모
layer: core
status: current
evidence:
- server.js:36
- local-store.js:20
- supabase/schema.sql:53-55
- README.md:28
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

업무 원문은 수정·삭제하지 않고 메모로 정정한다. 없는 업무는 404 다.

### R-005 변경 이력은 추가만 되고 시각은 서버가 기록한다
layer: core
status: current
evidence:
- local-store.js:9-11
- local-store.js:13
- supabase/schema.sql:12-22
- public/app.js:27
- README.md:28
golden:
- secured/detail-after-flow
test-name:
- 접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존
accept:
- Given 등록·상태 변경·메모를 거친 업무 / When 상세를 조회하면 / Then 변경 이력이 발생 순서대로 `등록`·`상태 변경`·`처리 메모` 로 나온다
- Given 기록된 변경 이력 / When 수정이나 삭제를 시도하면 / Then 저장소가 거부한다

변경 이력의 시각은 서버(로컬은 `new Date()`, 클라우드는 DB 시계)가 기록하고 행위자는 `총무 담당자` 로 고정된다. 요청 시각만 사용자가 한국 시간으로 입력한다. DB 관리자 권한 소유자의 변경까지 막지는 못한다(README.md:30).

### R-006 업무 목록과 상세
layer: core
status: current
evidence:
- server.js:25
- server.js:34
- local-store.js:16-17
- supabase/schema.sql:28-29
- supabase/schema.sql:43-45
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

상세는 업무 항목에 변경 이력(`events`)을 발생 순서대로 붙여 돌려준다.

## 지원

### R-007 조회 계정은 아무것도 바꾸지 못한다
layer: supporting
status: current
evidence:
- server.js:21
- public/app.js:20
- public/app.js:28
- README.md:21
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

### R-008 Basic 로그인과 로컬 열린 모드
layer: supporting
status: current
evidence:
- server.js:13
- server.js:18
- server.js:19
- server.js:24
- public/app.js:14
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
- server.js:22
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
- server.js:7-9
- supabase-store.js:3-5
- README.md:20
- README.md:24
golden:
test-name:
- 배포 설정 누락 시 임시 디스크로 시작하지 않음
accept:
- Given `NODE_ENV=production` 이고 `STORAGE_BACKEND` 가 supabase 가 아닌 환경 / When 서버를 시작하면 / Then 오류로 종료한다
- Given 운영 또는 supabase 모드 / When 관리자나 조회 비밀번호가 없으면 / Then 오류로 종료한다

관리자와 조회 비밀번호가 같아도 시작하지 않는다. supabase 모드는 `SUPABASE_URL` 과 비밀 키가 있고 URL 이 `https://*.supabase.co` 루트일 때만 시작한다. 연결 오류가 나도 로컬 저장으로 바꾸지 않는다.

### R-011 업무 보드, 검색, 상태 필터
layer: supporting
status: current
evidence:
- public/app.js:16
- public/app.js:19
golden:
test-name:
accept:
- Given 업무 보드 화면 / When 검색어를 입력하면 / Then 제목·요청자·부서에 대소문자 구분 없이 검색어가 들어 있는 업무만 보인다
- Given 업무 보드 화면 / When 상태를 고르면 / Then 그 상태의 업무만 보인다

### R-012 CSV 내려받기
layer: supporting
status: current
evidence:
- public/app.js:16
- public/app.js:24
golden:
test-name:
accept:
- Given 업무 보드 화면 / When CSV 내려받기를 누르면 / Then 업무, 요청자, 부서, 접수 경로, 분류, 상태, 요청 시각, 등록 시각, 완료 시각 열의 `총무업무_날짜.csv` 가 내려온다

파일은 BOM 이 붙은 UTF-8 이고, 셀이 `=`·`+`·`@`·`-` 로 시작하면 앞에 `'` 를 붙여 수식으로 읽히지 않게 한다. 내려받는 목록은 화면 필터와 무관하게 전체 업무다.

### R-013 누적 실적과 소요 시간
layer: supporting
status: current
evidence:
- public/app.js:5
- public/app.js:11
- public/app.js:17
- README.md:28
golden:
test-name:
accept:
- Given 업무가 여럿 쌓인 상태 / When 화면 위쪽 통계를 보면 / Then 전체 업무는 누적 접수 건수, 진행 중·완료 업무는 현재 상태 건수, 기한 초과는 기한이 오늘(한국 시간)보다 앞서면서 완료가 아닌 건수다
- Given 완료 상태의 업무가 있는 상태 / When 업무 실적 화면을 보면 / Then 평균 처리 소요 시간은 요청 시각부터 완료 시각까지의 달력 시간(대기·주말 포함)을 시간 단위로 평균한 값이다

실적은 누적 기준이다. 소요 시간은 현재 완료 상태인 업무만 센다. 재개하면 완료 시각이 비워지므로 그 업무는 다시 완료될 때까지 빠진다.

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

## 범위 밖(후속 기능)

### R-015 첨부파일
layer: out
status: planned
evidence:
- README.md:30
golden:
test-name:

### R-016 팀장 확인과 댓글
layer: out
status: planned
evidence:
- README.md:30
golden:
test-name:

### R-017 월별 기간 필터
layer: out
status: planned
evidence:
- README.md:30
golden:
test-name:

### R-018 AI 요약
layer: out
status: planned
evidence:
- README.md:30
golden:
test-name:

### R-019 개인별 인증
layer: out
status: planned
evidence:
- README.md:21
- README.md:30
golden:
test-name:
