# 아키텍처 — web/ (Next.js, 헥사고날 + DDD)

규칙 여덟과 검사 명령은 `AGENTS.md` §3, DB 정규화 규칙은 §4 가 소유한다. 이 문서는 규칙이 폴더와 Next.js 에 어떻게 놓이는지와 업무 요청 한 건이 지나는 실제 길을 보여 준다.

## 1. 계층과 Next.js 대응

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

서버 액션(`'use server'`)은 쓰지 않는다. 액션은 가드 파이프라인(인증·조회 권한·출처·본문 한도)을 거치지 않아 조회 계정이 검사를 우회한다. 판정: `/usr/bin/grep -rln "use server" web/src` 가 비어 있다(종료코드 1).

의존 방향은 바깥에서 안쪽이다: `app/` → `adapter/in/web` → `application` → `domain`. `adapter/out` 은 출력 포트를 구현하며, `config/container.ts` 만 그것을 import 한다.

## 2. 폴더 트리

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

컨텍스트 폴더는 `domain/` 이 있는 `web/src` 의 직속 하위 폴더다. 컨텍스트 목록은 `find web/src -mindepth 2 -maxdepth 2 -name domain -type d` 로 센다. 전체 폴더는 `ls web/src` 로 본다. 컨텍스트가 아닌 직속 폴더는 `app`·`config`·`parity`(기존 포털과 응답을 견주는 시험 도구)·`security`(보안 시험)다. 새 컨텍스트는 `request/` 와 같은 모양의 폴더를 `web/src/` 아래에 추가한다. 컨텍스트마다 모든 하위 폴더가 있지는 않다. `board` 는 도메인과 화면만, `portal` 은 화면과 시험 보조만 있다.

## 3. 업무 요청 한 바퀴 — `request` 컨텍스트

규칙(검증·이력·상태 전이)은 기존 DB 함수가 소유하고, 앱은 그 함수를 호출하는 길과 그 앞의 입력 검사를 소유한다.

### 3.1 도메인

- `domain/` 은 DB 를 부르기 전에 웹 계층이 필요한 어휘와 입력 규칙만 쥔다: `TaskStatus`(상태 어휘), `TaskLimits`(등록·메모 입력 한도), `TaskEdit`(수정 입력 규칙), `TaskLifecycle`(삭제·복원·영구 삭제 동작).
- 상태를 받아들이거나 거절하는 최종 권한은 DB 함수다. 도메인 코드는 setter 를 두지 않는다.
- 단위 테스트는 프레임워크 없이 이 파일들만 만든다.

### 3.2 포트

| 포트 | 방향 | 역할 |
|---|---|---|
| `RequestUseCases`(`application/port/in/`) | 입력 | 핸들러가 부르는 진입점 묶음. 유스케이스마다 인터페이스가 하나다 |
| `OrbitFunctions`(`shared/port/`) | 출력 | 기존 SQL 함수 다섯을 이름과 인자로 부르는 유일한 길. 테이블에는 닿지 않는다 |

### 3.3 서비스

- `createRequestUseCases(open)` 가 서비스를 만든다. 서비스는 입력을 `OrbitFunctions.call` 한 번의 인자로 옮기고 결과를 돌려준다. 규칙은 서비스에 쓰지 않는다.
- `open` 은 처음 부를 때 DB 를 연다. 가드만 쓰는 요청은 연결을 만들지 않는다.
- BDD 테스트는 가짜 `OrbitFunctions` 를 꽂고 Given / When / Then 으로 쓴다.

### 3.4 어댑터와 조립

- `adapter/in/web/routes.ts` 가 경로마다 핸들러를 잇고, 핸들러가 요청 본문을 `schemas.ts` 의 스키마(zod)로 검사한 뒤 입력 포트를 부른다. DB 오류는 `errorMapping.ts` 가 기존 포털과 같은 응답으로 옮긴다.
- `shared/adapter/out/` 에 `OrbitFunctions` 의 구현 둘이 있다. `PostgresOrbitFunctions` 는 Drizzle(`drizzle-orm/postgres-js`)의 `sql` 실행으로 `select public.<함수>(...)` 를 매개변수로 부른다. `PgliteOrbitFunctions` 는 `supabase/*.sql` 을 인메모리 PGlite 에 올려 같은 호출을 받는다.
- `config/container.ts` 의 `createContainer(env)` 가 컨텍스트마다 라우트를 모아 가드 파이프라인을 만든다. `DATABASE_URL` 이 있으면 Postgres(검증된 TLS), 없으면 PGlite 다. 운영(`NODE_ENV=production`)에서 `DATABASE_URL` 이 없으면 만들 때 예외가 나고 서버는 시작하지 않는다. `getContainer()` 는 프로세스당 하나를 돌려준다.

### 3.5 한 바퀴

```
app/api/[...path]/route.ts → 가드 파이프라인(인증·조회 권한·출처·본문 한도)
  → request/adapter/in/web/routes.ts → 핸들러(스키마 검사) → 입력 포트(서비스)
  → OrbitFunctions.call → Postgres 또는 PGlite → supabase/*.sql 의 함수
```

통합 시나리오 테스트(`request.scenario.spec.ts`)가 이 한 줄을 PGlite 까지 통과시킨다. 판정: `cd web && node --test src/request/adapter/in/web/request.scenario.spec.ts` 의 종료코드가 0 이다.

## 4. 영속 계층과 정규화

도메인 모델과 테이블 설계는 별개다. 스키마의 정본은 `supabase/*.sql` 이고 앱은 테이블을 직접 읽거나 쓰지 않는다. 앱 전용 DB 역할은 함수 실행 권한만 가진다(`web/db/app-role.sql`, 소유자가 SQL 편집기에서 한 번 실행한다). 정규화 규칙은 `AGENTS.md` §4 가 소유한다.

테이블 목록: `/usr/bin/grep -nEio "create table (if not exists )?[a-z_.]+" supabase/schema.sql supabase/kpi.sql supabase/deletion.sql supabase/settings.sql` (`supabase/upgrade.sql` 은 같은 정의를 이미 배포된 DB 에 맞추는 스크립트라 뺀다).

- 이력 테이블 다섯(`events`·`task_lifecycle_events`·`improvement_events`·`monthly_reports`·`settings_events`)은 모두 `before update or delete` 트리거로 수정·삭제를 막는다. 판정: `/usr/bin/grep -nEi "before update or delete" supabase/schema.sql supabase/kpi.sql supabase/deletion.sql supabase/settings.sql` 가 다섯 줄이다.
- 테이블끼리는 id 외래키로만 가리킨다(`events`·`task_extras`·`task_files` 는 `tasks(id)`, `improvement_events` 는 `improvements(id)`). 판정: 같은 파일들에서 `/usr/bin/grep -nEi -e references -e "foreign key"` 가 참조 컬럼마다 줄을 낸다.
- 접근 경로 하나(`web/src/shared/port/OrbitFunctions.ts`)와 SQL 함수 정의(`supabase/*.sql`)가 한 요청의 트랜잭션 경계다. ORM 선택과 import 허용 범위는 `AGENTS.md` §4 가 소유한다.

## 5. 새 동작이 들어가는 곳

| 하려는 일 | 놓는 곳 |
|---|---|
| 새 유스케이스 | `web/src/<컨텍스트>/` — `node web/scripts/new-usecase.ts <컨텍스트> <유스케이스>` 로 시작한다 |
| 기존 포털 버그 수정 | 해당 파일만 고치고 시험으로 고정한다 |
| 새 레거시 파일 | 허용 목록(`test/legacy-files.json`)에 더하는 커밋 |

규칙과 검사 명령은 `AGENTS.md` §7 이 소유한다.

## 6. 확인

| 보려는 것 | 명령 |
|---|---|
| 의존 방향과 경계 | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 타입 | `cd web && npx tsc --noEmit` |
| 빌드 | `cd web && npm run build` |
| 기존 포털 보호 | 루트에서 `npm test` |

규칙의 이름·번호·검사 방식은 `AGENTS.md` §3 을 본다. 이식 절차는 `AGENTS.md` §7 이 소유한다.
