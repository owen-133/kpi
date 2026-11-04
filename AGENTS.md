# AGENTS.md

이 파일이 저장소 규칙의 유일한 정본이다. `CLAUDE.md` 와 `docs/architecture.md` 는 여기를 가리킨다.
Codex 는 git 루트부터 이 파일을 읽고(상한 32 KiB), Claude Code 는 `CLAUDE.md` 의 `@AGENTS.md` 로 읽는다.

## 1. 저장소 지도

| 위치 | 내용 | 실행 |
|---|---|---|
| 저장소 루트 | 기존 총무 업무 포털(orbit.ops). 바닐라 Node. `server.js`, `local-store.js`, `supabase-store.js`, `public/`, `supabase/`, `test/`, `render.yaml`, `DEPLOY.md` | `npm start` / `npm test` |
| `web/` | 새 Next.js 앱. 헥사고날 + DDD | `cd web && npm test` |
| `docs/architecture.md` | `web/` 의 계층 배치, 폴더 트리, 예시 애그리거트 `Request` | 읽기 |

- 기존 포털은 정상 운영 중인 기본 화면이다. 새 앱은 화면 단위로 이식한다(§7).
- 판정: `ls web/src docs/architecture.md` 가 오류 없이 나온다.

## 2. 역할과 모델

| 역할 | 하는 일 | 모델·노력 |
|---|---|---|
| 일반 대화 | 질문, 읽기, 작은 수정 | 빠른 범용 모델 |
| `architect` 에이전트 | 설계, 일감 분할(파일 범위·포트 시그니처·완료 조건) | 추론이 가장 강한 모델, 노력 high |
| `implementer` 에이전트 | 나눠 준 일감 하나의 구현 | 범용 모델 |

모델 이름은 `.codex/config.toml` 과 `.codex/agents/*.toml` 이 소유한다. 여기에는 적지 않는다.
판정: `ls .codex/config.toml .codex/agents/` 에 `architect.toml`, `implementer.toml` 이 보인다.

전환 명령:
- 일반 대화: `codex`
- 설계 세션 전체를 강한 모델로: `codex -m gpt-6-astra -c model_reasoning_effort="high"` 또는 세션 안에서 `/model`
- 대화 중 설계·분할이 필요하면 `architect` 에이전트에게 맡겨 달라고 요청한다. 일감 하나의 구현은 `implementer` 에이전트에게 맡겨 달라고 요청한다. 서브에이전트는 사용자가 직접 요청할 때 시작된다

설정이 강제하는 것과 이 글만 강제하는 것:

| 강제하는 쪽 | 내용 | 확인 |
|---|---|---|
| 설정(`.codex/`) | 모델, 노력, 스레드 상한 | `cat .codex/config.toml .codex/agents/*.toml` |
| 이 글만 | 언제 맡기는가, implementer 는 받은 파일 범위 안에서만 고친다, 아래 규칙 준수 | 리뷰에서 `git diff --stat` 의 파일이 일감의 `Files` 안에 있는지 본다 |

일감 형식: `Goal`(한 줄) · `Files`(만들거나 고칠 경로) · `Done when`(명령과 기대 종료코드). 계층·포트·인터페이스를 정하는 일은 implementer 가 하지 않는다. 설계 질문이 남으면 일감을 `architect` 에게 돌려준다.

### Claude Code 로 쓸 때

- 메인 대화: Sonnet 5.5
- 설계·분할: Opus (Plan 모드 또는 `system-architect` 에이전트)
- 구현: Sonnet

## 3. 헥사고날 규칙 여덟

`web/src/<컨텍스트>/{domain,application/{port/in,port/out,service},adapter/{in/web,out/*}}` 와 `web/src/config/container.ts` 가 뼈대다. 자세한 배치는 `docs/architecture.md` 에 있다.

| # | 규칙 | 이름 | 검사 명령 |
|---|---|---|---|
| 1 | `domain` 은 외부(프레임워크·DB·`application`·`adapter`)를 import 하지 않는다 | Dependency Rule | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 2 | 상태 변경은 엔티티·애그리거트 메서드로만 한다. setter 를 두지 않는다 | Tell, Don't Ask | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 3 | 서비스에 변경 로직을 중복해 쓰지 않는다. 도메인 메서드를 재사용한다 | Rich Domain Model | 리뷰: `/usr/bin/grep -rn "status =" web/src/*/application` 이 비어 있다 |
| 4 | 애플리케이션 서비스는 흐름만 조립한다. 비즈니스 규칙을 넣지 않는다 | Thin Application Service | 리뷰: 서비스의 분기문이 규칙이 아니라 흐름(없으면 오류)인지 읽는다 |
| 5 | 외부 연동은 포트로 정의하고 어댑터가 구현한다 | Ports and Adapters / DIP | `cd web && npm test` 중 규칙 1 검사가 `application` 의 외부 import 도 막는다 |
| 6 | 어댑터는 서로 호출하지 않는다. 항상 포트를 거친다 | Ports and Adapters | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 7 | 애그리거트는 다른 애그리거트를 ID 로만 참조한다 | Aggregate Reference by ID | 리뷰: 애그리거트 필드 타입에 다른 애그리거트 클래스가 없다 |
| 8 | 트랜잭션 하나에서 애그리거트 하나만 바꾸고 나머지는 이벤트로 맞춘다 | Eventual Consistency | 리뷰: 서비스 한 메서드의 `save` 호출이 애그리거트 하나뿐이다 |

기계 검사(`web/src/architecture.spec.ts`)가 보는 것은 규칙 1·2·6 과 `app/` 경계다. 3·4·7·8 은 리뷰가 본다. 5 는 1 의 검사가 `application` 쪽 외부 import 를 막는 범위까지만 기계가 본다.

Next.js 대응:
- `app/` 의 라우트·페이지·컴포넌트는 `adapter/in/web` 에 해당한다. `adapter/in/web` 과 `config/container` 만 import 한다. 판정: `cd web && npm test`
- `actions.ts`(`'use server'`)는 일반 핸들러를 감싸는 얇은 껍데기다. 로직은 핸들러에 둔다
- `adapter/out` 을 import 하는 파일은 `config/container.ts` 뿐이다. 판정: `/usr/bin/grep -rln "adapter/out" web/src --include=*.ts --include=*.tsx` 의 결과가 `config/container.ts` 와 `adapter/out` 자신과 테스트뿐이다

## 4. DB 정규화

테이블 설계는 도메인 모델과 별개다. 매핑은 `adapter/out/persistence` 의 매퍼가 한다(`docs/architecture.md`). 스키마 파일 경로 `web/src/request/adapter/out/persistence/schema.ts` 를 `<스키마>` 로 쓴다(기존 `supabase/schema.sql` 은 고치지 않는다).

| # | 규칙 | 검사 |
|---|---|---|
| 1 | 1NF: 컬럼은 원자값이다. 반복 컬럼 묶음(memo1, memo2 …)과 한 컬럼에 담은 목록을 두지 않는다 | 플래그(판정 아님): `/usr/bin/grep -nEi -e 'jsonb?' -e 'text\[\]' -e 'array' -e '[a-z]+[0-9] ' <스키마>` 에 걸린 컬럼을 사람이 읽어 판정한다 |
| 2 | 2NF: 복합키 테이블에서 키 일부에만 종속된 컬럼이 없다 | 리뷰에서 본다: 복합 `primary key` 마다 나머지 컬럼이 키 전체로 정해지는지 읽는다 |
| 3 | 3NF: 키가 아닌 컬럼이 다른 키 아닌 컬럼에 종속되지 않는다. 참조 데이터는 자기 테이블에 둔다 | 리뷰에서 본다 |
| 4 | 파생값(소요 시간, 누적 실적)은 저장하지 않고 저장된 사실에서 계산한다. 추정 숫자는 저장하지 않는다 | 리뷰에서 본다. 보조: `/usr/bin/grep -nEi -e 'total' -e 'sum' -e 'elapsed' -e 'duration' -e 'avg' <스키마>` 로 파생 컬럼 후보를 플래그한다 |
| 5 | 애그리거트끼리는 ID 로 참조하고 DB 는 그것을 외래키로 지닌다(§3 규칙 7) | `/usr/bin/grep -nEi -e 'references' -e 'foreign key' <스키마>` 가 참조 컬럼마다 하나씩 나온다 |
| 6 | 이력·감사 테이블은 추가 전용이다(update·delete 차단. 기존 `supabase/schema.sql` 의 `events_immutable` 트리거 설계와 같다). 애그리거트 하나는 자기 테이블 묶음에 대응한다(§3 규칙 8) | `/usr/bin/grep -nEi 'before update or delete' <스키마>` 가 이력 테이블마다 하나씩 나온다 |
| 7 | 비정규화는 잰 이유가 있을 때만 하고, 그 이유를 테이블 옆 주석에 적는다 | 리뷰에서 본다: 중복 컬럼 옆에 측정값을 적은 주석이 있다 |
| 8 | 새 쿼리는 실행 전에 순수 `EXPLAIN` 으로 본다(라이브에서 `EXPLAIN ANALYZE` 금지). `WHERE` 주조건은 인덱스 컬럼이고 함수로 감싸지 않는다. DDL 은 엔진이 지원하면 온라인 알고리즘을 명시하고, 인덱스·제약 이름은 64자 이하다 | `EXPLAIN <쿼리>` 의 출력에서 인덱스 사용을 본다. 이름 길이 플래그: `/usr/bin/grep -nEio -e 'index [a-z0-9_]{65,}' -e 'constraint [a-z0-9_]{65,}' <스키마>` 가 비어 있다 |

### ORM 과 마이그레이션

- ORM 은 Drizzle(`drizzle-orm`, `drizzle-kit`), 운영 드라이버는 `postgres`, 테스트는 인메모리 PGlite(`@electric-sql/pglite`)다. 스키마는 TypeScript 로 쓴다.
- ORM·드라이버 import 는 `adapter/out/persistence/**` 와 `config/{container,database}.ts` 에서만 한다. 판정: `cd web && npm test` (`web/src/architecture.spec.ts` 의 ORM 규칙)
- 마이그레이션 SQL 은 `web/drizzle/` 에 있다. 스키마를 고치면 `cd web && npx drizzle-kit generate` 로 만들고, 트리거처럼 스키마 파일로 못 쓰는 DDL 은 `npx drizzle-kit generate --custom` 의 빈 파일에 손으로 쓴다. 판정: 스키마를 고치지 않은 상태에서 `npx drizzle-kit generate && git status --porcelain web/drizzle` 이 비어 있다.
- 마이그레이션 적용은 직접 연결 또는 세션 연결(`DATABASE_URL`)로 `npx drizzle-kit migrate` 를 한다. 트랜잭션 풀러로는 하지 않는다. 적용은 DB 쓰기라 사용자가 직접 한다.
- 실행 시 저장소는 환경변수 `PERSISTENCE=memory|postgres`(기본 `memory`)로 고른다. `postgres` 인데 `DATABASE_URL` 이 없으면 컨테이너를 만들 때 예외가 난다. 판정: `cd web && PERSISTENCE=postgres node -e "import('./src/config/container.ts').then((m) => m.createContainer())"` 가 `DATABASE_URL is required` 로 종료코드 1 이다.

DB 쓰기(DDL·DML)는 사용자가 직접 실행한다. 내가 SQL 을 넘기고 실행하지 않는다.

## 5. 테스트 — TDD 와 세 층

**TDD 로 쓴다.** 새 동작은 실패하는 테스트를 먼저 쓰고(red), 통과시키고(green), 정리한다(refactor). red 를 실제로 본 명령과 실패 메시지를 보고에 적는다. 판정: 새 동작마다 `cd web && npm test` 가 구현 전에 그 테스트에서 실패했다는 출력이 있다.

| 층 | 대상 | 방식 |
|---|---|---|
| 단위 | `domain` | 프레임워크 없이 순수 TypeScript. 불변식과 규칙을 빠르게 많이 |
| BDD | `application/service` | 가짜 포트를 꽂고 Given / When / Then 으로 이름과 본문을 쓴다 |
| 통합 시나리오 | 핸들러 → 서비스 → 어댑터 | 실제 어댑터까지 요청부터 저장까지 한 줄로 흐른다. 이름은 사용자 말로 쓴다 |

새 유스케이스는 세 층을 모두 갖춘다. 판정: 새 유스케이스마다 세 층의 spec 파일이 `git diff --stat` 에 보인다.

### 테스트 쓰는 법
- **실패할 수 있는 케이스만 쓴다.** 케이스마다 그것이 빨개지는 상황을 한 줄로 말할 수 있어야 한다. 못 하면 장식이다. 고친 버그를 되심었을 때 스위트가 실제로 빨개지는지 한 번 확인하고 보고에 적는다.
- **네 덩어리를 다 덮는다.** 성공(해피 패스는 구현이 이미 증명하므로 늘려도 얻는 게 없다) · 선언된 모든 오류(에러 목록이 곧 케이스 목록) · 실패(의존성 오류, 롤백, 부분 실패) · 엣지.
- **엣지 일곱 축을 이 순서로 훑는다.** ① 부재(없으면 실패할지 통과할지를 정하고 검사한다) ② 경계(0, 1, N-1, N, N+1, 임계가 `>=` 인지 `>` 인지) ③ 중복·재진입(두 번 부르면, 덮어쓰면 안 되는 것을 덮는지) ④ 오염된 입력(따옴표·개행·유니코드·공백) ⑤ 동시성·격리(남의 상태를 건드리는지) ⑥ 플랫폼(경로 구분자·셸) ⑦ 검사기 자신(죽으면 초록과 구별되는지).
- **최소 하한선.** 새 실행 코드마다 부재 1 + 정상 1 + 막아야 할 것 1, 분기를 더하면 분기마다 1. 막아야 할 것 1개마다 막으면 안 되는 것 1개를 짝으로 둔다.
- **이름이 주장하는 것을 단언한다.** 케이스 이름의 동사를 그대로 단언으로 옮긴다(`never-overwrites` 면 결과값이 아니라 저장된 값을 본다). 비슷한 케이스는 표(`for` 루프나 `test.each` 꼴)로 모아 케이스 수를 줄이지 말고 코드량을 줄인다.
- **분모는 명세에서 온다.** 선언한 케이스 수와 실행된 수를 맞춰 본다. 실행 결과에서 분모를 뽑아 `ok N/N` 으로 쓰지 않는다. 실패를 보고하는 능력도 한 번 검사한다.
- **보고.** `[TESTED]` 블록으로 어디까지 검사했고 무엇을 못 했는지 적고, `untested:` 줄을 남긴다. 경계 없는 통과 개수는 검증으로 읽지 않는다.

## 6. 기존 화면 보호

- 리팩터링은 기존 포털의 출력을 바꾸지 않는다. 판정: 루트에서 `npm test` 가 통과한다(골든 검사 `test/golden.test.js` 포함).
- 골든 스냅샷은 `UPDATE_GOLDEN=1 npm test` 로만 다시 쓴다. 사용자가 승인한 뒤에, 그 변경만 담은 별도 커밋으로 한다.

## 7. 이식 규칙

- 화면은 하나씩 Next 로 옮긴다.
- 라우트마다 동등성 spec 이 있다. 같은 입력을 기존 포털과 새 라우트에 보내 정규화한 응답이 같아야 한다. 판정: `cd web && npm test` 가 통과한다.
- 동등성 spec 이 통과하고 사용자가 승인하기 전까지 기본 화면은 기존 포털이다. 전환은 `render.yaml` 에서 하고, 승인 없이 `render.yaml` 을 고치지 않는다. 판정: `git diff --stat -- render.yaml` 이 승인 커밋 밖에서 비어 있다.

## 8. 변경 규율

- 실패를 가리는 폴백을 만들지 않는다. 먼저 죽는다(fail fast). Supabase 오류가 나도 로컬 저장소로 돌아가지 않는다. 판정: `/usr/bin/grep -n "catch" supabase-store.js server.js` 의 각 `catch` 가 오류를 다시 던지거나 응답 오류로 바꾼다.
- 산출물에 추정 숫자를 넣지 않는다. 숫자는 실데이터에서 파생한다.
- 총무 업무 데이터는 실데이터만 쓴다. 시뮬레이션·임의 샘플로 채우지 않는다. 실데이터가 없으면 값을 어떻게 확보할지를 대신 보고한다.

## 9. 완료 조건

일을 끝내기 전에 모두 종료코드 0 이어야 한다.

```
npm test
cd web && npm ci && npm test && npx tsc --noEmit && npm run build
```

종료코드는 파이프에 물리지 않고 직접 본다. 통과하지 못한 채 끝내면 어느 명령이 왜 실패했는지 적는다.
