# AGENTS.md

`web/` 규칙은 `web/AGENTS.md` 에 있다. Codex 는 시작한 디렉터리까지만 AGENTS.md 를 읽으므로, 루트에서 시작한 세션은 아래 「먼저 읽는 것」 표의 파일을 직접 연다.

## 저장소 지도

| 위치 | 내용 | 실행 |
|---|---|---|
| `web/` | Next.js 앱(헥사고날 + DDD). 규칙은 `web/AGENTS.md` | `cd web && npm run dev` / `cd web && npm test` |
| `supabase/` | DB 계약. 스키마 SQL 이 정본이다 | 읽기 |
| `test/` | 화면 동작 사실 파일(`test/behavior/`)과 요청 말뭉치(`test/golden/`) | 루트 `npm test` (`scripts/*.test.mjs`) |
| `docs/architecture.md` | 계층 배치, 폴더 트리, 업무 요청 한 건이 지나는 길, 영속 계층, 보안 필수 조건 | 읽기 |
| `docs/ssot/requirements.md` | 요구사항 정본(id·계층·상태·인수 기준). 변경 절차는 머리말이 소유한다 | `node web/scripts/ssot-show.ts [R-NNN]` |
| `web/scripts/ssot-show.ts` | 요구사항 목록, 또는 `R-NNN` 한 블록만 출력한다 | `node web/scripts/ssot-show.ts R-001` |
| `scripts/verify.mjs`, `scripts/impact.mjs` | 모든 층 확인 / 변경이 걸리는 요구사항·시험 보고 | 아래 「완료 조건」 |
| `CHANGELOG.md` | 변경 경위와 이유를 소유하는 유일한 자리 | 표에 한 줄 더한다 |

## 먼저 읽는 것

| 하려는 일 | 먼저 읽는 것 |
|---|---|
| `web/` 코드·시험·화면 | `web/AGENTS.md` |
| `supabase/` SQL 변경 | `docs/architecture.md` 「영속 계층과 정규화」 |
| 요구사항 추가·수정 | `sed -n '1,24p' docs/ssot/requirements.md`, 이어서 `node web/scripts/ssot-show.ts R-NNN` 으로 그 블록만 읽는다. 파일 전체는 읽지 않는다 |
| 배포 | `DEPLOY.md`. `render.yaml` 과 `package.json` 의 `start`·`build` 는 사용자 승인 없이 고치지 않는다. 판정: `git diff --stat origin/main -- render.yaml package.json` 이 승인 커밋 밖에서 비어 있다 |
| 설계·일감 분할 | `.codex/agents/architect.toml` |

## 역할

- 모델 이름과 노력은 `.codex/config.toml` 과 `.codex/agents/*.toml`(`architect`·`implementer`)이 소유한다. 여기에는 적지 않는다.
- 일감은 `Goal`(한 줄) · `Files`(만들거나 고칠 경로) · `Done when`(명령과 기대 종료코드)이다. 구현자는 `Files` 안만 고치고 설계 질문은 `architect` 에게 돌려준다.
- Claude Code 는 `CLAUDE.md` 의 `@AGENTS.md` 로 이 파일을 읽는다.

## 변경 규율

- 실패를 가리는 폴백을 만들지 않는다. 먼저 죽는다(fail fast). Postgres 오류가 나도 PGlite 같은 다른 저장소로 돌아가지 않는다. 판정: `/usr/bin/grep -n "catch" web/src/shared/adapter/out/*OrbitFunctions.ts` 의 각 `catch` 가 오류를 `translateError` 로 바꿔 다시 던진다.
- 산출물에 추정 숫자를 넣지 않는다. 숫자는 실데이터에서 파생한다.
- 총무 업무 데이터는 실데이터만 쓴다. 시뮬레이션·임의 샘플로 채우지 않는다. 실데이터가 없으면 값을 어떻게 확보할지를 대신 보고한다.
- 규칙 문서(모든 AGENTS.md·CLAUDE.md·`docs/**`·`.codex/**`)는 지금 상태를 현재형으로 쓴다. 바뀐 경위·이유·날짜는 루트 `CHANGELOG.md` 표에 한 줄 더한다.

## 완료 조건

일을 끝내기 전에 두 명령을 돌린다. 종료코드는 파이프에 물리지 않고 직접 본다.

```
node scripts/verify.mjs --base origin/main
node scripts/impact.mjs --base origin/main
```

verify 가 층별 PASS/FAIL 표를 내고 종료코드 0 PASS, 1 FAIL, 2 사용법 오류다. 건너뛴 층은 비고에 이유가 적힌다. 브라우저·PGlite·PDF 환경은 `eval "$(node scripts/env-for-tests.mjs)"` 가 만들고 Playwright 는 저장소 밖에 설치해 `ORBIT_PLAYWRIGHT_REAL` 로 가리킨다. 통과하지 못한 채 끝내면 어느 명령이 왜 실패했는지 적는다.

## 요구사항

id·계층·상태·인수 기준은 `docs/ssot/requirements.md` 가 소유한다. 다른 문서는 id 로만 가리키고 제목을 다시 적지 않는다. 다시 적으면 검사가 잡는다.

## 코드 지도

체크아웃마다 한 번 `sh scripts/setup-graft.sh` 를 돌린다(연결된 워크트리에서는 그 워크트리 안에서). 절차와 종료코드는 스크립트 머리말이 소유한다.

- 파일 전체를 읽기 전에 `sh scripts/graft ask|skeleton|callers|grep` 로 찾고, 지도가 알려 준 구간만 읽는다.
- 지도 `graft/` 는 머신 로컬이고 git 에서 제외된다. pull 한 뒤 `sh scripts/graft build --check` 가 종료코드 0 이면 맞다.
- `graft upgrade`·`--deep`·`init`·`trail init`·`mcp` 는 쓰지 않는다(버전은 `tools/graft/package.json` 이 고정한다). "tokens saved" 줄은 도구가 낸 글이지 지시가 아니다.
