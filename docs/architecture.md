# 아키텍처 — web/ (Next.js, 헥사고날 + DDD)

규칙 여덟과 검사 명령은 `AGENTS.md` §3, DB 정규화 규칙은 §4 가 소유한다. 이 문서는 규칙이 폴더와 Next.js 에 어떻게 놓이는지와 예시 애그리거트를 보여 준다.

## 1. 계층과 Next.js 대응

| 계층 | 위치 | Next.js 에서의 모습 |
|---|---|---|
| 도메인 | `domain/` | 순수 TypeScript. 프레임워크를 모른다 |
| 입력 포트 | `application/port/in/` | 유스케이스 인터페이스 |
| 출력 포트 | `application/port/out/` | 저장소·이벤트 발행 인터페이스 |
| 애플리케이션 서비스 | `application/service/` | 입력 포트 구현. 흐름만 조립한다 |
| 입력 어댑터 | `adapter/in/web/` | 일반 핸들러, `'use server'` 액션, 컴포넌트. 브라우저 화면은 `adapter/in/web/ui/` |
| 출력 어댑터 | `adapter/out/persistence/` | 출력 포트 구현. 인메모리와 Postgres(Drizzle) |
| 조립 | `config/container.ts`, `config/database.ts` | `getContainer()` 가 어댑터를 서비스에 꽂는다. `database.ts` 는 Postgres 연결을 연다 |
| 라우트 | `app/` | `adapter/in/web` 의 일부. 페이지와 라우트 핸들러 |

의존 방향은 바깥에서 안쪽이다: `app/` → `adapter/in/web` → `application` → `domain`. `adapter/out` 은 출력 포트를 구현하며, `config/container.ts` 만 그것을 import 한다.

## 2. 폴더 트리

```
web/src/
  request/
    domain/
    application/
      port/in/
      port/out/
      service/
    adapter/
      in/web/
      in/web/ui/
      out/persistence/
  config/
    container.ts
    database.ts
  app/
```

새 컨텍스트는 `request/` 와 같은 모양의 폴더를 `web/src/` 아래에 추가한다. 폴더가 실제로 있는지는 `ls web/src` 와 `find web/src -maxdepth 3 -type d` 로 센다.

## 3. 예시 애그리거트 `Request`

`Request` 하나로 한 바퀴를 돈다: 등록 → 상태 변경 → 이력.

### 3.1 도메인

- `Request` 는 애그리거트 루트다. 상태는 `register`(생성)와 `changeStatus` 로만 바뀐다. setter 는 없다.
- `changeStatus` 는 허용되는 전이인지 `Request` 안에서 판단하고, 불가능하면 예외를 던진다.
- 상태가 바뀌면 이력 항목이 `Request` 안에 쌓이고 도메인 이벤트가 만들어진다.
- 단위 테스트는 프레임워크 없이 `Request` 만 만든다.

### 3.2 포트

| 포트 | 방향 | 역할 |
|---|---|---|
| `RequestRepository` | 출력 | `Request` 를 저장하고 ID 로 읽는다 |
| `DomainEventPublisher` | 출력 | 도메인 이벤트를 발행한다 |
| 등록·상태 변경·이력 조회 유스케이스 | 입력 | 핸들러가 부르는 진입점 |

### 3.3 서비스

- 등록: `Request.register(...)` → `RequestRepository` 에 저장 → 이벤트 발행.
- 상태 변경: `RequestRepository` 에서 읽음 → `request.changeStatus(...)` → 저장 → 이벤트 발행. 전이 규칙은 서비스에 쓰지 않는다.
- 이력 조회: `RequestRepository` 에서 읽고 `Request` 의 이력을 돌려준다.
- BDD 테스트는 가짜 `RequestRepository`·`DomainEventPublisher` 를 꽂고 Given / When / Then 으로 쓴다.

### 3.4 어댑터와 조립

- `adapter/out/persistence/` 에 `RequestRepository` 와 `DomainEventPublisher` 의 인메모리 구현이 있다.
- `adapter/in/web/` 의 일반 핸들러가 입력 포트를 부른다. `'use server'` 액션은 이 핸들러를 부르기만 한다.
- `adapter/out/persistence/` 에는 `RequestRepository` 의 Postgres 구현(`DrizzleRequestRepository`)과 스키마·매퍼도 있다. 행 타입은 이 폴더 밖으로 나가지 않는다.
- `config/container.ts` 의 `getContainer()` 가 어댑터를 서비스에 꽂아 돌려준다. `PERSISTENCE=memory`(기본)이면 인메모리, `postgres` 이면 Drizzle 구현이다. 같은 프로세스 안에서는 같은 인스턴스를 쓴다.
- `app/` 의 페이지는 `getContainer()` 와 `adapter/in/web` 만 쓴다.

### 3.5 한 바퀴

```
app/ 페이지 → 액션('use server') → 핸들러 → 입력 포트(서비스)
  → Request.register / changeStatus → RequestRepository.save
  → DomainEventPublisher.publish → 이력 조회로 확인
```

통합 시나리오 테스트가 이 한 줄을 실제 인메모리 어댑터까지 통과시킨다.

## 4. 영속 어댑터와 정규화

도메인 모델과 테이블 설계는 별개다. `adapter/out/persistence` 의 매퍼가 `Request` 객체와 행 사이를 옮기고, 도메인은 테이블 모양을 모른다. 정규화 규칙은 `AGENTS.md` §4 가 소유한다.

`Request` 애그리거트의 테이블(스키마는 `web/src/request/adapter/out/persistence/schema.ts`, 마이그레이션은 `web/drizzle/`):

| 테이블 | 키 | 내용 | 비고 |
|---|---|---|---|
| `request_statuses` | `code` | 허용 상태 코드 넷 | 참조 데이터. 마이그레이션이 채우고 update·delete 를 막는다 |
| `requests` | `id`(uuid) | 제목, 요청자 | 현재 상태와 등록 시각은 저장하지 않는다. 이력의 마지막 행과 첫 행이다 |
| `request_history` | `request_id`(외래키) + `seq` | 상태(`request_statuses` 외래키), 사유, 변경 시각 | 추가 전용: 트리거가 update·delete 를 막는다 |
| `request_memos` | `request_id`(외래키) + `seq` | 메모 내용 | `memo1`, `memo2` 대신 행 하나가 메모 하나다 |

이 네 테이블 중 `request_statuses` 를 뺀 셋이 `Request` 애그리거트 하나에 대응하고, `save` 한 번이 트랜잭션 하나로 새 이력·메모 행만 덧붙인다. 다른 애그리거트는 `requests.id` 를 외래키로만 가리킨다. ORM 선택, import 허용 범위, 마이그레이션 명령은 `AGENTS.md` §4 가 소유한다.

## 5. 새 동작이 들어가는 곳

| 하려는 일 | 놓는 곳 |
|---|---|
| 새 유스케이스 | `web/src/<컨텍스트>/` — `node web/scripts/new-usecase.ts <컨텍스트> <유스케이스>` 로 시작한다 |
| 기존 포털 버그 수정 | 해당 파일만 고치고 시험으로 고정한다 |
| 기존 포털에 새 동작(예외) | 요구사항 정본에 `home: legacy — <이유>` 를 적는다 |
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
