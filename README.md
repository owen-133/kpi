# orbit.ops — 총무 업무 포털

총무 담당자가 구두·메신저 요청을 대신 접수하고 상태, 처리 메모, 변경 이력을 쌓는 포털입니다. 예시 실적 없이 빈 목록으로 시작합니다. 업무 보드·검색·CSV·누적 실적·팀장 조회 계정을 지원합니다.

앱은 `web/`의 Next.js(헥사고날 + DDD)입니다. 요구사항의 정본은 `docs/ssot/requirements.md`, 계층 배치는 `docs/architecture.md`, 작업 규칙은 `AGENTS.md`에 있습니다.

## 로컬 개발

Node.js 24 이상이 필요합니다.

```sh
cd web
npm ci
npm run dev
```

`http://127.0.0.1:3000`에서 열립니다. `DATABASE_URL`이 없으면 인메모리 PGlite(`@electric-sql/pglite`)가 `supabase/*.sql`을 읽어 올린 데이터베이스를 쓰므로 프로세스를 끄면 데이터가 사라집니다.

시작 규칙(`web/src/config/startupChecks.ts`, `web/src/access/domain/AccessConfiguration.ts`):

- `ADMIN_PASSWORD`가 없고 운영(`NODE_ENV=production`)이 아니며 `DATABASE_URL`도 없으면 로그인 없는 개발 모드입니다. 모든 요청이 관리자 권한입니다.
- 운영이거나 `DATABASE_URL`이 있으면 `ADMIN_PASSWORD`와 `VIEWER_PASSWORD`가 모두 필요합니다. 없으면 서버가 시작을 거부합니다.
- 두 비밀번호가 같으면 시작을 거부합니다.
- 운영에서 `DATABASE_URL`이 없으면 시작을 거부합니다. 파일 저장소나 임시 저장으로 대체하지 않습니다.
- 비밀번호가 설정되면 HTTP Basic 인증이며 `admin`은 변경, `viewer`는 조회만 허용합니다. 개인별 SSO는 없습니다.

## 테스트

```sh
cd web && npm test                  # 단위·BDD·통합·보안·구조 검사
cd web && npx tsc --noEmit          # 타입
cd web && npm run build             # 빌드
npm test                            # 루트 도구 시험(scripts/*.test.mjs)
node scripts/verify.mjs --base origin/main   # 위 전부와 생성 파일·graft·AGENTS.md 크기·제품 파일 불변을 한 번에
```

브라우저·PDF 시험은 환경이 있을 때만 돕니다. 환경은 `eval "$(node scripts/env-for-tests.mjs)"`가 만들고, Playwright는 저장소 밖에 설치해 `ORBIT_PLAYWRIGHT_REAL`로 가리킵니다. 화면 동작은 `node scripts/capture-behavior.mjs --target next --check`가 `test/behavior/*.facts.json`과 비교합니다.

## 저장소 구조

| 위치 | 내용 |
|---|---|
| `web/src/<컨텍스트>/` | 컨텍스트별 `domain`·`application`·`adapter`. 컨텍스트 목록은 `ls web/src` |
| `web/src/config/` | 조립(`container.ts`), DB 연결, 시작 검사 |
| `web/db/app-role.sql` | 앱 전용 DB 역할(함수 실행 권한만). 소유자가 한 번 실행 |
| `supabase/*.sql` | DB 계약. 앱은 테이블이 아니라 여기의 DB 함수만 부릅니다 |
| `test/behavior/` | 화면 동작 기록(사실 파일과 설명) |
| `test/golden/requests.js` | 요청 말뭉치 |
| `scripts/` | 확인(`verify.mjs`, `impact.mjs`), 환경, 코드 지도(`graft`), `build-upgrade.js` |
| `docs/` | 아키텍처, 요구사항 정본 |

## 배포

**Render Free 서버 + Supabase Free PostgreSQL**을 사용합니다. 유료 디스크는 사용하지 않습니다. 절차와 환경변수는 [DEPLOY.md](DEPLOY.md), `render.yaml`은 무료 플랜과 필요한 변수를 명시합니다.

- 배포 환경은 `DATABASE_URL`, 관리자·조회 비밀번호가 필수입니다.
- `DATABASE_URL`은 TLS 검증을 끌 수 없습니다(`sslmode=disable` 등은 접속 거부).
- 등록·상태 변경·메모는 DB 함수에서 트랜잭션으로 저장합니다. 변경 이력 테이블의 수정·삭제는 트리거로 막습니다.
- DB 연결 오류 시 다른 저장소로 전환하지 않습니다.

## 기록과 기능 범위

요청 시각은 한국 시간으로 입력하고 등록·변경 시각은 DB에서 기록합니다. 완료 후 재개 사유가 필요합니다. 업무 상세의 업무 수정에서 원문을 정정할 수 있고 변경 전후 내용과 수정 사유를 이력으로 보존합니다. 실적은 누적 기준, 소요 시간은 대기·주말을 포함한 요청부터 최종 완료까지의 시간입니다.

- 업무 보드: 날짜별 보기(요청일·완료일·등록일 기준, 시작일·종료일 필터), 상태 필터, 검색, CSV
- 상세: 담당자 배정·최초 배정 시각, 파일 첨부(파일당 1MB, 업무당 10개), 실제/테스트 업무 구분, 업무 수정
- 대시보드: 실제 업무의 월간 접수·완료·기한 준수·평균 경과시간, 활성 화면에서 30초 갱신
- 업무 실적: 월 선택, 지표 CSV, 규칙 기반 초안, 검토 후 발행, A4 PDF 내려받기(브라우저에서 생성)
- 개선 이력: 단계, 출처, 개선 전후, 검증 결과, 버전 이력과 CSV
- 관리자 설정: 포털 문구·메뉴·배너·업무 선택 항목·로고·색상. 수정 전후 이력과 동시 수정 충돌 검사
- 삭제: 관리자가 사유와 함께 휴지통으로 이동, 복원 또는 제목 확인 후 영구 삭제. 최소 감사 기록은 남고 제목·본문은 복제하지 않음
- 자동 분류·유사 업무·보고서 초안은 규칙 기반이며 생성형 AI는 쓰지 않습니다

접근은 공용 `admin`/`viewer` 계정이라 개별 사람을 식별하지 않습니다. DB 관리자 권한 소유자의 변경까지 막는 외부 감사 시스템은 아닙니다. 무료 플랜에는 용량·유휴 중지 등 제한이 있어 운영 전 공급자 조건과 백업 방식을 확인해야 합니다.

지표 정의·시연/검증 절차·제약은 [KPI_GUIDE.md](KPI_GUIDE.md)에 있습니다.
