# 아키텍처 — web/ (Next.js, 헥사고날 + DDD)

규칙 여덟과 검사 명령은 `web/AGENTS.md` 「헥사고날 규칙 여덟」 이 소유한다. 이 문서는 규칙이 폴더와 Next.js 에 어떻게 놓이는지와 업무 요청 한 건이 지나는 실제 길을 보여 준다.

## 계층과 Next.js 대응

| 계층 | 위치 | Next.js 에서의 모습 |
|---|---|---|
| 도메인 | `domain/` | 순수 TypeScript. 프레임워크를 모른다 |
| 입력 포트 | `application/port/in/` | 유스케이스 인터페이스 |
| 출력 포트 | `application/port/out/`, `shared/port/` | 외부 연동 인터페이스. DB 는 `shared/port/OrbitFunctions.ts` 하나다 |
| 애플리케이션 서비스 | `application/service/` | 입력 포트 구현. 흐름만 조립한다 |
| 입력 어댑터 | `adapter/in/web/` | 라우트 정의와 일반 핸들러. 브라우저 화면(컴포넌트·흐름)은 `adapter/in/web/ui/` |
| 출력 어댑터 | `adapter/out/<기술>/` | 출력 포트 구현. DB 는 `shared/adapter/out/`(운영 Postgres, 개발·시험 PGlite) |
| 조립 | `config/container.ts`, `config/database.ts` | `getContainer()` 가 라우트를 모아 가드 파이프라인에 꽂는다. `database.ts` 는 Postgres 연결을 연다 |
| 라우트 | `app/` | `adapter/in/web` 의 일부. API 는 `app/api/[...path]/route.ts` 한 개가 모든 `/api/*` 를 가드 파이프라인으로 보낸다 |

의존 방향은 바깥에서 안쪽이다: `app/` → `adapter/in/web` → `application` → `domain`. `adapter/out` 은 출력 포트를 구현하며, `config/container.ts` 만 그것을 import 한다.

## 폴더 트리

```
web/src/
  <컨텍스트>/
    domain/
    application/
      port/in/
      port/out/
      service/
    adapter/
      in/web/
      in/web/ui/
      out/<기술>/
  shared/
    domain/
    port/OrbitFunctions.ts
    adapter/in/web/
    adapter/out/
  config/
    container.ts
    database.ts
  app/
    api/[...path]/route.ts
```

컨텍스트 폴더는 `domain/` 이 있는 `web/src` 의 직속 하위 폴더다. 컨텍스트 목록은 `find web/src -mindepth 2 -maxdepth 2 -name domain -type d` 로 센다. 전체 폴더는 `ls web/src` 로 본다. 컨텍스트가 아닌 직속 폴더는 `app`·`config`·`parity`(녹화한 응답과 견주는 동등성 시험 도구)·`security`(보안 시험)다. 새 컨텍스트는 `request/` 와 같은 모양의 폴더를 `web/src/` 아래에 추가한다. 컨텍스트마다 모든 하위 폴더가 있지는 않다. `board` 는 도메인과 화면만, `portal` 은 화면과 시험 보조만 있다.

## 업무 요청 한 바퀴 — `request` 컨텍스트

규칙(검증·이력·상태 전이)은 기존 DB 함수가 소유하고, 앱은 그 함수를 호출하는 길과 그 앞의 입력 검사를 소유한다.

### 도메인

- `domain/` 은 DB 를 부르기 전에 웹 계층이 필요한 어휘와 입력 규칙만 쥔다: `TaskStatus`(상태 어휘), `TaskLimits`(등록·메모 입력 한도), `TaskEdit`(수정 입력 규칙), `TaskLifecycle`(삭제·복원·영구 삭제 동작).
- 상태를 받아들이거나 거절하는 최종 권한은 DB 함수다. 도메인 코드는 setter 를 두지 않는다.
- 단위 테스트는 프레임워크 없이 이 파일들만 만든다.

### 포트

| 포트 | 방향 | 역할 |
|---|---|---|
| `RequestUseCases`(`application/port/in/`) | 입력 | 핸들러가 부르는 진입점 묶음. 유스케이스마다 인터페이스가 하나다 |
| `OrbitFunctions`(`shared/port/`) | 출력 | 기존 SQL 함수 다섯을 이름과 인자로 부르는 유일한 길. 테이블에는 닿지 않는다 |

### 서비스

- `createRequestUseCases(open)` 가 서비스를 만든다. 서비스는 입력을 `OrbitFunctions.call` 한 번의 인자로 옮기고 결과를 돌려준다. 규칙은 서비스에 쓰지 않는다.
- `open` 은 처음 부를 때 DB 를 연다. 가드만 쓰는 요청은 연결을 만들지 않는다.
- BDD 테스트는 가짜 `OrbitFunctions` 를 꽂고 Given / When / Then 으로 쓴다.

### 어댑터와 조립

- `adapter/in/web/routes.ts` 가 경로마다 핸들러를 잇고, 핸들러가 요청 본문을 `schemas.ts` 의 스키마(zod)로 검사한 뒤 입력 포트를 부른다. DB 오류는 `errorMapping.ts` 가 HTTP 응답으로 옮긴다.
- `shared/adapter/out/` 에 `OrbitFunctions` 의 구현 둘이 있다. `PostgresOrbitFunctions` 는 Drizzle(`drizzle-orm/postgres-js`)의 `sql` 실행으로 `select public.<함수>(...)` 를 매개변수로 부른다. `PgliteOrbitFunctions` 는 `supabase/*.sql` 을 인메모리 PGlite 에 올려 같은 호출을 받는다.
- `config/container.ts` 의 `createContainer(env)` 가 컨텍스트마다 라우트를 모아 가드 파이프라인을 만든다. 저장소 선택 규칙은 `web/AGENTS.md` 「DB 접근」 이 소유한다. `getContainer()` 는 프로세스당 하나를 돌려준다.

### 한 바퀴

```
app/api/[...path]/route.ts → 가드 파이프라인(인증·조회 권한·출처·본문 한도)
  → request/adapter/in/web/routes.ts → 핸들러(스키마 검사) → 입력 포트(서비스)
  → OrbitFunctions.call → Postgres 또는 PGlite → supabase/*.sql 의 함수
```

통합 시나리오 테스트(`request.scenario.spec.ts`)가 이 한 줄을 PGlite 까지 통과시킨다. 판정: `cd web && node --test src/request/adapter/in/web/request.scenario.spec.ts` 의 종료코드가 0 이다.

## 영속 계층과 정규화

도메인 모델과 테이블 설계는 별개다. 스키마의 정본은 `supabase/*.sql` 이고 앱은 테이블을 직접 읽거나 쓰지 않는다. 앱 전용 DB 역할은 함수 실행 권한만 가진다(`web/db/app-role.sql`). ORM 선택과 import 허용 범위는 `web/AGENTS.md` 「DB 접근」 이 소유한다.

테이블 목록: `/usr/bin/grep -nEio "create table (if not exists )?[a-z_.]+" supabase/schema.sql supabase/kpi.sql supabase/deletion.sql supabase/settings.sql` (`supabase/upgrade.sql` 은 같은 정의를 이미 배포된 DB 에 맞추는 스크립트라 뺀다).

- 이력 테이블 다섯(`events`·`task_lifecycle_events`·`improvement_events`·`monthly_reports`·`settings_events`)은 모두 `before update or delete` 트리거로 수정·삭제를 막는다. 판정: `/usr/bin/grep -nEi "before update or delete" supabase/schema.sql supabase/kpi.sql supabase/deletion.sql supabase/settings.sql` 가 다섯 줄이다.
- 테이블끼리는 id 외래키로만 가리킨다(`events`·`task_extras`·`task_files` 는 `tasks(id)`, `improvement_events` 는 `improvements(id)`). 판정: 같은 파일들에서 `/usr/bin/grep -nEi -e references -e "foreign key"` 가 참조 컬럼마다 줄을 낸다.
- 접근 경로 하나(`web/src/shared/port/OrbitFunctions.ts`)와 SQL 함수 정의(`supabase/*.sql`)가 한 요청의 트랜잭션 경계다.

### 정규화 규칙

`<스키마>` 는 `supabase/schema.sql supabase/kpi.sql supabase/deletion.sql supabase/settings.sql` 네 파일이다. 이 파일들을 고치면 `node scripts/build-upgrade.js` 로 `supabase/upgrade.sql` 을 다시 만든다(`node scripts/check-generated.mjs` 가 같은지 본다).

| # | 규칙 | 검사 |
|---|---|---|
| 1 | 1NF: 컬럼은 원자값이다. 반복 컬럼 묶음(memo1, memo2 …)과 한 컬럼에 담은 목록을 두지 않는다 | 플래그(판정 아님): `/usr/bin/grep -nEi -e 'jsonb?' -e 'text\[\]' -e 'array' -e '[a-z]+[0-9] ' <스키마>` 에 걸린 컬럼을 사람이 읽어 판정한다 |
| 2 | 2NF: 복합키 테이블에서 키 일부에만 종속된 컬럼이 없다 | 리뷰에서 본다: 복합 `primary key` 마다 나머지 컬럼이 키 전체로 정해지는지 읽는다 |
| 3 | 3NF: 키가 아닌 컬럼이 다른 키 아닌 컬럼에 종속되지 않는다. 참조 데이터는 자기 테이블에 둔다 | 리뷰에서 본다 |
| 4 | 파생값(소요 시간, 누적 실적)은 저장하지 않고 저장된 사실에서 계산한다. 추정 숫자는 저장하지 않는다 | 리뷰에서 본다. 보조: `/usr/bin/grep -nEi -e 'total' -e 'sum' -e 'elapsed' -e 'duration' -e 'avg' <스키마>` 로 파생 컬럼 후보를 플래그한다 |
| 5 | 애그리거트끼리는 ID 로 참조하고 DB 는 그것을 외래키로 지닌다(`web/AGENTS.md` 「헥사고날 규칙 여덟」 규칙 7) | `/usr/bin/grep -nEi -e 'references' -e 'foreign key' <스키마>` 가 참조 컬럼마다 하나씩 나온다 |
| 6 | 이력·감사 테이블은 추가 전용이다(update·delete 차단. `events_immutable` 트리거 설계). 애그리거트 하나는 자기 테이블 묶음에 대응한다(`web/AGENTS.md` 「헥사고날 규칙 여덟」 규칙 8) | `/usr/bin/grep -nEi 'before update or delete' <스키마>` 가 이력 테이블마다 하나씩 나온다 |
| 7 | 비정규화는 잰 이유가 있을 때만 하고, 그 이유를 테이블 옆 주석에 적는다 | 리뷰에서 본다: 중복 컬럼 옆에 측정값을 적은 주석이 있다 |
| 8 | 새 쿼리는 실행 전에 순수 `EXPLAIN` 으로 본다(라이브에서 `EXPLAIN ANALYZE` 금지). `WHERE` 주조건은 인덱스 컬럼이고 함수로 감싸지 않는다. DDL 은 엔진이 지원하면 온라인 알고리즘을 명시하고, 인덱스·제약 이름은 64자 이하다 | `EXPLAIN <쿼리>` 의 출력에서 인덱스 사용을 본다. 이름 길이 플래그: `/usr/bin/grep -nEio -e 'index [a-z0-9_]{65,}' -e 'constraint [a-z0-9_]{65,}' <스키마>` 가 비어 있다 |

DB 쓰기(DDL·DML)는 사용자가 직접 실행한다. 내가 SQL 을 넘기고 실행하지 않는다. 스키마 변경은 `supabase/*.sql` 에서 하고 적용은 DB 쓰기라 사용자가 직접 한다.

## 새 동작이 들어가는 곳

| 하려는 일 | 놓는 곳 |
|---|---|
| 새 유스케이스 | `web/src/<컨텍스트>/` — `node web/scripts/new-usecase.ts <컨텍스트> <유스케이스>` 로 시작한다 |
| DB 규칙 변경 | `supabase/*.sql` — 「영속 계층과 정규화」 를 따른다 |
| 화면 변경 | `*/adapter/in/web/ui/` 와 `test/behavior/` 사실 파일(「화면 검증 방법」) |

규칙과 검사 명령은 `web/AGENTS.md` 「화면과 동등성」 이 소유한다.

## 보안 필수 조건

- **DB 접근은 함수 호출뿐이다.** 앱 전용 역할은 함수 실행 권한만 갖고 테이블 권한이 없다(`web/db/app-role.sql`). 테이블을 직접 쓰는 방식을 새로 들이지 않는다. 직접 쓰기가 불가피하면 소유자가 아닌 역할, 이력 테이블은 SELECT·INSERT 만, `TRUNCATE`·`TRIGGER`·`CREATE` 금지, 정책 명시, 삭제는 정의자 함수 하나만 허용해야 한다. 권한 SQL 은 사용자가 실행한다.
- **운영 DB 접속은 TLS 를 검증한다.** 검증을 끄는 접속 URL(`sslmode=disable` 등)은 거부하고, 비밀 값은 서버 전용 모듈에만 둔다.
- **인증·역할 검사는 프록시, 핸들러, 응용 계층에서 반복한다.** 자격 증명 비교는 해시 비교(`timingSafeEqual`)이고 두 역할을 항상 모두 계산한다. 가드 파이프라인 순서는 인증 → 조회 권한 → 출처 → 본문 한도 → 경로 → 404 → 405 이고, 던져진 오류는 일반 503 이다. 쓰기(GET·HEAD 가 아닌 요청)는 출처 검사 다음에 `Sec-Fetch-Site` 가 `cross-site`·`same-site` 이면 403 으로 막고(`same-origin`·`none`·없음은 통과), POST 는 `Content-Type` 이 `application/json`(대소문자 무관, `; charset=…` 허용)이 아니면 본문을 읽기 전에 415 로 막는다. 무인증 401 과 조회 계정 403 이 먼저다. CSRF 방어는 `Origin` 검사 하나가 아니라 `Origin`·`Sec-Fetch-Site`·JSON 전용 `Content-Type` 셋이다.
- **모든 경로를 `src/proxy.ts` 가 인증한다.** `_next/static` 을 포함한다.
- **보안 헤더는 프록시가 모든 응답에 붙인다**(401·403·404·413·503 포함): nonce 기반 CSP, HSTS, `nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `frame-ancestors 'none'`, `poweredByHeader: false`.
- **본문은 스트림으로 읽어 상한을 넘으면 중단한다.** 전체를 읽은 뒤 검사하지 않는다. 개발·운영 서버는 `HOST` 가 없으면 `127.0.0.1` 에 바인딩한다.
- **DB 오류가 개인정보를 로그에 남기지 않는다.** 로그에는 경로·상태·오류 이름만 쓴다.
- **의존성은 정확한 버전으로 고정한다**(`web/package.json`).
- **필수 시험:** 모든 경로 × {무인증, 틀린 비밀번호, 조회, 관리자} 권한 행렬, 조회 계정의 쓰기가 행 수를 바꾸지 않음, 출처 검사, `Sec-Fetch-Site`·`Content-Type` 검사(거절과 통과 짝), 본문 한도(청크 전송), 헤더 스냅샷, DB 오류 속 표식 값이 로그에 없음, 앱 역할로 이력 변경·`TRUNCATE`·`DISABLE TRIGGER` 가 실패, CSV 수식 입력, 업로드 경계, 번들에 비밀 이름 없음. 위치: `web/src/security/`.
- **사용자 승인이 필요한 변화:** HTTP Basic 을 세션·SSO 로 바꾸기, 로그인 실패 횟수 제한·최소 비밀번호 길이, 업로드 내용 검사.

## 화면 구조 규칙

화면은 `*/adapter/in/web/ui/` 의 브라우저 코드다. 구조 검사 규칙 `UI`·`STYLE` 은 `web/AGENTS.md` 「헥사고날 규칙 여덟」 이 소유한다.

- **경로는 `/` 하나다.** 화면(개요·보드·실적·개선 이력)은 reducer 상태이고 `app/page.tsx` 는 서버 컴포넌트(`dynamic = 'force-dynamic'`)로 클라이언트 컴포넌트 `<PortalApp/>` 하나를 그린다. 대화상자는 `<dialog>` 이고 `showModal()` 로만 연다.
- **껍데기는 서버에서 기본 설정으로 그리고 `#content` 는 비운다.** 데이터는 브라우저에서 세션 → 설정 → 업무 순서로 불러온다. 시계·로케일·`window` 에 기대는 것은 데이터가 온 뒤에만 그린다.
- **서버 상태는 TanStack Query 가 읽기에만 쓴다.** 질의 기본값은 `queryClient.ts` 가 소유한다: `staleTime: Infinity`, `retry: false`, 포커스·재연결·마운트·주기 재조회 없음. 읽는 시점과 키는 `queryKeys.ts` 가 소유한다. 개요의 30초 갱신은 화면 타이머가 하고 TanStack 자동 재조회는 쓰지 않는다.
- **쓰기는 일반 async 흐름 함수다**(`*Flow.ts`). API 를 부른 뒤 `refresh()` 나 다시 열기를 정해진 순서로 부른다. `useMutation` 을 쓰지 않는다.
- **화면 상태는 `useReducer`, 폼은 비제어다.** 제출 때 `FormData` 로 읽어 브라우저 기본 `required`·`maxlength` 검증이 동작한다.
- **스타일 변경은 effect 안에서 ref 로 한다.** 화면 스타일은 `portal/adapter/in/web/ui/portal.css` 의 전역 스타일시트이고 `app/layout.tsx` 가 import 한다. 보드만 `*.module.css` 를 쓴다.
- **UI 는 도메인 함수를 직접 쓰고 복사하지 않는다.** 날짜·이벤트 문구·CSV 칸 같은 표시 서식은 `ui/` 에 둔다.
- **컨텍스트마다 `ui/` 에 타입 있는 API 클라이언트**(`XxxApi` 인터페이스, `createXxxApi(client)`)와 `ui/testing/fakeXxxApi.ts` 를 둔다. 흐름 시험은 가짜 API 와 호출 기록용 가짜 `actions` 를 꽂는다. `application/port/out` 이 아니다.
- **PDF 와 CSV 는 브라우저에서 만든다.** PDF 는 npm `pdf-lib`·`@pdf-lib/fontkit` 을 클릭할 때 `import()` 로 불러오고 글꼴은 `web/public/fonts/NanumGothic-Regular.ttf` 를 쓴다(라이선스 사본은 같은 폴더). CSV 칸의 수식 방어는 업무 CSV 와 개선 이력 CSV 가 `web/src/shared/adapter/in/web/ui/csvCell.ts` 의 `csvCell`(`/^\s*[=+@-]/`, 앞 공백이 있으면 공백 앞에 `'`) 하나를 쓴다. 지표 CSV 는 시스템 숫자·날짜만 담아 쓰지 않는다.
- **새 시험 라이브러리(jsdom, Testing Library)를 더하지 않는다.** 시험 러너(`node --test "src/**/*.spec.ts"`)에는 JSX 로더가 없어 시험은 `.ts` 만 쓴다. 브라우저 시나리오는 `ORBIT_PLAYWRIGHT_PATH` 가 없으면 건너뛴다.

## CSP 와 nonce

- CSP 는 `src/proxy.ts` 가 요청마다 nonce 를 만들어 붙인다: `script-src 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'nonce-…'`, `default-src 'self'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`. `'unsafe-inline'` 은 없다(개발 서버만 스크립트에 `'unsafe-eval'` 을 더한다). 판정: `web/src/access/adapter/in/web/securityHeaders.ts`
- 서버가 그린 HTML 의 `style` 속성은 브라우저가 버리고, 자바스크립트가 바꾸는 스타일은 적용된다. 그래서 `style` prop 은 `web/AGENTS.md` 「헥사고날 규칙 여덟」 의 `STYLE` 규칙이 막는다.
- 페이지는 요청마다 렌더링해야 Next 의 스크립트에 nonce 가 붙는다. `app/page.tsx` 의 `dynamic = 'force-dynamic'` 을 지우지 않는다.

## 화면 검증 방법

- **사실 파일.** `test/behavior/<화면>.facts.json` 은 화면의 접근성 트리(역할·이름·상태·순서)·폼 칸·제목·버튼·사용자에게 보이는 문구·상호작용마다의 효과를 담는다. 클래스 이름·`style` 속성·요소 id·SVG 데이터·id·시각은 담지 않는다(id 는 `<ID-n>`, 시각은 `<TS>` 로 정규화). `<화면>.md` 는 사람이 읽는 설명이다.
- **실행기.** `node scripts/capture-behavior.mjs --target next --check` 가 Next 앱을 빌드해 띄우고 Playwright 로 같은 상호작용을 재생해 사실 파일과 비교한다. 종료코드 0 같음, 1 다름(화면·변형·상호작용 번호·첫 다른 사실을 stderr 에 낸다), 2 환경 문제. 환경은 `eval "$(node scripts/env-for-tests.mjs)"` 가 만든다.
- **동등성 녹화.** `web/src/parity/recorded/*.json` 은 고정된 응답 녹화이고 `test/golden/requests.js` 가 요청 말뭉치다. 말뭉치가 바뀌었으면 시험이 녹화가 낡았다고 실패한다.
- **판정.** 화면이 사실 파일과 같다고 인정하는 것은 사람과 메인 세션이다.
