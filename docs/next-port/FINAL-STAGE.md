# 마무리 단계 설계

화면 이식이 끝난 뒤의 전환·레거시 삭제·Claude Board 흔적 삭제 계획이다. 규칙은 `AGENTS.md`, 이식 계획은 `PLAN.md` 가 소유한다.

## 1. 단계

| 단계 | 내용 | 승인 |
|---|---|---|
| Z | 기존 서버가 아직 있을 때 그 응답을 녹화해 시험이 기존 서버 없이 돈다. 기존 파일을 직접 읽는 시험을 고정값으로 바꾼다. 새 보드 컴포넌트 이름을 바꿔 흔적 검색에 안 걸리게 한다. | 없음(로컬) |
| S | 배포 전환 초안: `render.yaml`, 루트·`web` `package.json`, `DEPLOY.md` 배포 절. | 사용자 |
| 운영 확인 | 새 앱이 운영에서 돈다. 기존 코드는 main 에 남아 되돌릴 수 있다. | 사용자 |
| D | 기존 포털·도구 삭제(D1), 흔적 검색 0건과 문서 정리(D2), 옛 저장소 설정 키 제거(D3). | 사용자 |

기존 포털이 운영을 서비스하는 동안 보드 흔적을 지우면 그 보드 화면이 깨진다. 그래서 삭제는 배포 전환 뒤다.

## 2. 끝난 뒤의 구조

| 남긴다 | 지운다 |
|---|---|
| `web/**`, `supabase/*.sql`(DB 계약, 개발 저장소가 읽는다), `web/db/app-role.sql` | `server.js`, `local-store.js`, `supabase-store.js`, `kpi-store*.js`, `task-edit.js` |
| `test/golden/requests.js`, `test/behavior/**`, `web/src/parity/recorded/*.json` | `public/**`, `frontend/**`, `third_party/**`, `THIRD_PARTY_NOTICES.md` |
| `scripts/{verify,impact,env-for-tests,setup-graft,graft,capture-behavior,check-generated}`, `KPI_GUIDE.md` | 루트 `test/*.test.js`, `test/golden/legacy-*.json`, `test/legacy-files.json`, `scripts/compare-screens*`, 녹화 전 기존 서버 실행 코드 |
| 글꼴 라이선스 사본(`web/public/fonts/OFL.txt`, `SOURCE.txt`) | |

루트 `package.json` 은 남기고 최소화한다: `test`(도구 시험), `verify`, `build`(`web` 설치·빌드), `start`(`web` 시작).

## 3. 기존 서버를 대체하는 방식

기존 서버의 정규화된 응답을 커밋된 녹화로 고정한다(`web/src/parity/recorded/<spec>.json` = `{corpusSha256, results}`). 만드는 명령은 기존 서버가 있을 때 `web/scripts/record-parity.ts`, 확인은 `--check`. 녹화와 말뭉치 해시가 다르면 시험이 "말뭉치가 바뀌었고 기존 서버가 없다 — 새 시나리오 시험을 쓴다" 로 실패한다.

잃는 검증: 새 요청·바뀐 요청을 기존 서버와 비교하는 것, 화면 픽셀 비교, 녹화 밖 PDF 비교, 정규화가 가리는 필드.

## 4. 일감

| # | 목표 | 선행 |
|---|---|---|
| Z1 | 비교 시험이 녹화로 돈다(`recordedOracle.ts`, `credentials.ts`, `recorded/*.json`, `record-parity.ts`) | – |
| Z2 | 기존 파일을 읽는 시험 4개를 고정값으로 바꾸고 글꼴 라이선스를 `web/public/fonts` 로 옮긴다 | – |
| Z3 | 새 보드 컴포넌트 이름을 바꿔 흔적 검색에서 뺀다 | – |
| Z4 | `test/supabase.test.js` 의 PGlite 계약 시험을 web 으로 옮긴다 | – |
| Z5 | 요구사항이 인용하는 루트 시험마다 web 대응을 만들거나 해당 없음 사유를 적는다 | Z1 |
| Z6 | 요구사항 정본의 증거·`home:` 을 `web/src/...` 로 옮긴다 | Z1, Z2, Z4, Z5 |
| S1 | 배포 전환 초안 | Z6 |
| D1 | 기존 포털 삭제와 도구 정리 | 운영 확인 |
| D2 | 흔적 검색 0건, README·DEPLOY·AGENTS·architecture 정리, `docs/next-port` 의 유효 규칙을 `docs/architecture.md` 로 옮긴 뒤 삭제 | D1 |

각 일감은 자기 브랜치·커밋 하나이고 되돌릴 수 있다. 모든 단계의 관문은 `node scripts/verify.mjs --base origin/main` 이고 D1 에서만 `product-untouched` 가 삭제 경로로 실패한다.

## 5. 확인하지 못한 것

- Supabase 풀러에서 앱 전용 역할 로그인과 `DATABASE_CA`, Render 무료 빌드 메모리, `PORT` 주입, Blueprint 의 키 삭제 동작.
- 녹화는 빈 데이터베이스에서 고정된 요청 집합으로 만들어져 정규화가 숨기는 차이는 보이지 않는다.
- Claude Board 코드는 git 이력에 남는다(이력은 다시 쓰지 않는다). 흔적 검색은 작업 트리만 본다.
