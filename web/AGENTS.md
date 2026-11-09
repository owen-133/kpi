`docs/architecture.md` 는 배치와 이유, 이 파일은 규칙과 검사 명령

명령은 `cd web &&` 로 시작하는 것만 `web/` 안에서 돌고, 나머지는 저장소 루트에서 돈다.

## 헥사고날 규칙 여덟

`web/src/<컨텍스트>/{domain,application/{port/in,port/out,service},adapter/{in/web,out/*}}` 와 `web/src/config/container.ts` 가 뼈대다. 컨텍스트 사이에 공유하는 것은 `web/src/shared/` 에 둔다. 자세한 배치는 `docs/architecture.md` 에 있다.

| # | 규칙 | 이름 | 검사 명령 |
|---|---|---|---|
| 1 | `domain` 은 외부(프레임워크·DB·`application`·`adapter`)를 import 하지 않는다 | Dependency Rule | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 2 | 상태 변경은 엔티티·애그리거트 메서드로만 한다. setter 를 두지 않는다 | Tell, Don't Ask | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 3 | 서비스에 규칙을 중복해 쓰지 않는다. 도메인 코드나 DB 함수가 이미 가진 규칙을 재사용한다 | Rich Domain Model | 리뷰: `/usr/bin/grep -rn "status =" web/src/*/application` 이 비어 있다(종료코드 1) |
| 4 | 애플리케이션 서비스는 흐름만 조립한다. 비즈니스 규칙을 넣지 않는다 | Thin Application Service | 리뷰: 서비스의 분기문이 규칙이 아니라 흐름(없으면 오류)인지 읽는다 |
| 5 | 외부 연동은 포트로 정의하고 어댑터가 구현한다 | Ports and Adapters / DIP | `cd web && npm test` 중 규칙 1 검사가 `application` 의 외부 import 도 막는다 |
| 6 | 어댑터는 서로 호출하지 않는다. 항상 포트를 거친다 | Ports and Adapters | `cd web && npm test` (`web/src/architecture.spec.ts`) |
| 7 | 애그리거트는 다른 애그리거트를 ID 로만 참조한다 | Aggregate Reference by ID | 리뷰: `/usr/bin/grep -rn "^export class" web/src/*/domain` 로 나온 클래스의 필드 타입에 다른 애그리거트 클래스가 없다 |
| 8 | 트랜잭션 하나에서 애그리거트 하나만 바꾸고 나머지는 이벤트로 맞춘다 | Eventual Consistency | 리뷰: 쓰기 서비스 한 메서드의 `functions.call(` 이 DB 함수 하나뿐이다(DB 함수 하나가 트랜잭션 하나다) |

기계 검사(`web/src/architecture.spec.ts`)가 보는 것은 규칙 1·2·6 과 `app/` 경계다. 3·4·7·8 은 리뷰가 본다. 5 는 1 의 검사가 `application` 쪽 외부 import 를 막는 범위까지만 기계가 본다.

Next.js 대응:
- `app/` 의 라우트·페이지·컴포넌트는 `adapter/in/web` 에 해당한다. `adapter/in/web` 과 `config/container` 만 import 한다. 판정: `cd web && npm test`
- `*/adapter/in/web/ui/**`(브라우저 화면)의 시험 아닌 파일은 같은 `ui/**`·`*/domain/**`·`*.css`·UI 패키지(`react`, `react-dom`, `@tanstack/react-query`, `pdf-lib`, `@pdf-lib/fontkit`)만 import 하고, `src` 의 `.tsx` 는 `style={` 을 쓰지 않는다(CSP). 판정: `cd web && npm test` 의 규칙 `UI`·`STYLE`
- 서버 액션(`'use server'`)은 쓰지 않는다. 액션은 `/api/*` 의 가드 파이프라인(인증·조회 권한·출처·`Sec-Fetch-Site`·JSON `Content-Type`·본문 한도)을 거치지 않아 조회 계정이 검사를 우회한다. 판정: `/usr/bin/grep -rln "use server" web/src` 가 비어 있다(종료코드 1)
- `adapter/out` 을 import 하는 파일은 `config/container.ts` 뿐이다. 판정: `/usr/bin/grep -rln "adapter/out" web/src --include=*.ts --include=*.tsx` 의 결과가 `config/container.ts` 와 `adapter/out` 자신, 시험 도구(`parity/`, `architecture.*`)뿐이다

## DB 접근

- 앱은 Drizzle(`drizzle-orm`)의 `sql` 실행으로 기존 DB 함수 다섯(`web/src/shared/port/OrbitFunctions.ts`)만 부른다. TypeScript 스키마 정의, `drizzle-kit`, 앱이 만드는 마이그레이션은 없다. 판정: `ls web/drizzle web/drizzle.config.ts` 가 `No such file` 이고 `/usr/bin/grep -c drizzle-kit web/package.json` 이 0 이다.
- 운영 드라이버는 `postgres`(검증된 TLS, `web/src/config/databaseSecurity.ts`), 개발·시험은 인메모리 PGlite(`@electric-sql/pglite`)이고 PGlite 는 `supabase/*.sql` 을 읽어 올린다. `DATABASE_URL` 이 있으면 운영 어댑터, 없으면 PGlite 다.
- 운영(`NODE_ENV=production`)에 `DATABASE_URL` 이 없으면 시작을 거부한다. 판정: `cd web && node -e "import('./src/config/container.ts').then((m) => m.createContainer({ NODE_ENV: 'production', ADMIN_PASSWORD: 'a', VIEWER_PASSWORD: 'b' }))"` 가 `운영 배포에는 DATABASE_URL이 필요합니다.` 로 종료코드 1 이다.
- ORM·드라이버 import 는 `*/adapter/out/**`, `shared/adapter/out/**`, `config/**` 에서만 한다. 판정: `cd web && npm test` (`web/src/architecture.spec.ts` 의 ORM 규칙)
- 앱 전용 DB 역할(`web/db/app-role.sql`)은 함수 실행 권한만 갖는다. 소유자가 SQL 편집기에서 직접 한 번 실행한다. 판정: `cd web && node --test src/security/roles.security.spec.ts`

## 테스트 — TDD 와 세 층

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

## 화면과 동등성

- **새 동작은 `web/src/<컨텍스트>/` 헥사고날 구조에서 시작한다.** 시작 명령: `node web/scripts/new-usecase.ts <컨텍스트> <유스케이스> [--out-port <이름>]`. 실패하는 시험과 `planned` 요구사항(`home:` 포함)이 같이 생기고, `config/container.ts` 에 더할 줄은 출력만 한다. 판정: 종료코드 0, 이어서 `cd web && npm test` 가 새 시험에서 실패한다(red).
- 화면 동작은 `test/behavior/<화면>.facts.json`(접근성 트리·폼·제목·버튼·문구·상호작용 결과)이 고정한다. 화면을 고치면 사실 파일과 설명(`<화면>.md`)이 같이 맞아야 한다. 판정: `eval "$(node scripts/env-for-tests.mjs)" && node scripts/capture-behavior.mjs --target next --check` 종료코드 0. 사실 파일은 사용자가 승인한 변경에서만 다시 쓴다.
- 라우트마다 동등성 spec 이 있다. 요청 말뭉치(`test/golden/requests.js`)를 새 라우트에 보내 정규화한 응답이 녹화(`web/src/parity/recorded/*.json`)와 같아야 한다. 녹화는 고정이다 — 새 요청이나 바뀐 요청은 녹화가 아니라 새 시나리오 spec 으로 시험한다. 판정: `cd web && npm test` 가 통과한다.
