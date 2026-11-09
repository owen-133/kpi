# 루트 시험과 web 대응표

`docs/ssot/requirements.md` 가 인용하는 루트 시험(`test/*.test.js`)마다 web 대응을 가리킨다. 기존 포털(`server.js`, 저장소 파일, `public/`, `frontend/`)을 지우면 루트 시험도 사라지므로, 요구사항 증거는 이 표의 web 대응으로 옮겨진다. 옮기는 일은 Z6 이 한다. 규칙은 `AGENTS.md`, 일감은 `docs/next-port/FINAL-STAGE.md` 가 소유한다.

## 1. 세는 명령

```
ls test/*.test.js | wc -l                                     # 루트 시험 파일
T='awk "/^test-name:/{f=1;next}/^[a-z-]+:/{f=0}/^### /{f=0}f&&/^- /" docs/ssot/requirements.md'
eval "$T" | wc -l; eval "$T" | sort -u | wc -l                # 인용 횟수 / 제목(중복 뺌)
G='awk "/^golden:/{f=1;next}/^[a-z-]+:/{f=0}/^### /{f=0}f&&/^- /" docs/ssot/requirements.md'
eval "$G" | wc -l; eval "$G" | sort -u | wc -l                # 골든 라벨 인용 횟수 / 라벨(중복 뺌)
git ls-files 'web/src/*.char.spec.ts' 'web/src/**/*.char.spec.ts' | wc -l          # 새 시험 파일
```

| 항목 | 값 |
|---|---|
| 루트 시험 파일 | 21 |
| 요구사항이 인용하는 시험 제목 인용 횟수 / 제목(중복 뺌) | 70 / 43 |
| 그 제목 중 `web/src` 의 시험에 글자 그대로 있는 것 | 1 (`PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존`) |
| 인용하는 골든 라벨 횟수 / 라벨(중복 뺌) | 59 / 56 (`test/golden/legacy-portal.json` 전체는 65 라벨) |
| 이 일감에서 새로 쓴 web 시험 파일 | 10 (`*.char.spec.ts`) |

판정 어휘: **있음** = 같은 입력과 기대값을 확인하는 web 시험이 이미 있다. **새로 씀** = 이 일감에서 썼다. **해당 없음** = 기존 포털에만 있는 동작이라 옮기지 않는다.
`golden: legacy behavior is unchanged` 는 web 에서 `web/src/parity/recorded/*.json`(녹화한 기존 포털 응답)을 되풀이해 비교하는 동등성 시험이 대신한다. 말뭉치는 `test/golden/requests.js` 이고 `public/` 에 기대지 않는다.

## 2. 인용된 제목별 대응 (43)

| # | 제목(앞부분) | 요구사항 | 루트 파일 | 판정 | web 대응 |
|---|---|---|---|---|---|
| 1 | `golden: legacy behavior is unchanged` | R-001 R-002 R-003 R-006 R-009 | golden.test.js | 있음 | `web/src/parity/guard.parity.spec.ts:48`(R-009), `web/src/request/adapter/in/web/request.parity.spec.ts:49`(R-001~R-006) — 녹화 비교. R-009 는 명시 기대값으로 `web/src/security/guard.char.spec.ts:112` 가 새로 덮는다 |
| 2 | `접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존` | R-003 R-004 R-005 R-007 R-008 | workflow.test.js | 새로 씀(+있음) | R-003/R-004: `web/src/request/adapter/in/web/request.scenario.spec.ts:150`(재개 사유), `:190`(메모). R-005: `web/src/request/adapter/in/web/history.char.spec.ts:46`. R-007: `web/src/security/guard.char.spec.ts:37`. R-008: `web/src/security/guard.char.spec.ts:69`. 「재시작 후 보존」은 해당 없음(§4) |
| 3 | `배포 설정 누락 시 임시 디스크로 시작하지 않음` | R-010 | supabase.test.js | 새로 씀 | `web/src/config/startup.char.spec.ts:12`, `web/src/config/startupChecks.spec.ts:6`, `web/src/config/container.spec.ts:11` |
| 4 | `원본 대표 상태 우선순위로 분류하고 완료 기록도 유지` | R-011 | board-model.test.js | 있음 | `web/src/board/domain/groupTasks.spec.ts:20` |
| 5 | `검색과 상태를 함께 적용하고 부서별로 재분류` | R-011 | board-model.test.js | 있음 | `web/src/board/domain/groupTasks.spec.ts:28` |
| 6 | `배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동` | R-015 R-020 R-021 R-022 R-023 R-025 R-027 R-030 | kpi-api.test.js | 새로 씀 | `web/src/config/kpiFlow.char.spec.ts:30` — 한 흐름을 같은 순서로 따라간다. 기존: 컨텍스트별 `*.scenario.spec.ts` |
| 7 | `PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존` | R-015 R-020 R-025 R-026 R-027 R-028 R-031 | supabase.test.js | 있음 | `web/src/shared/adapter/out/orbitSql.contract.spec.ts:17` (제목 그대로) |
| 8 | `10번째는 201 이고 11번째는 400 이며 다른 업무는 영향을 받지 않는다` | R-015 | char-kpi.test.js | 있음 + 새로 씀 | `web/src/attachment/adapter/in/web/attachment.scenario.spec.ts:106`, `web/src/attachment/adapter/in/web/attachmentHistory.char.spec.ts:27` |
| 9 | `1바이트·1048575·1048576(정확히 1MB) 바이트는 201 …` | R-015 | char-kpi.test.js | 있음 | `web/src/attachment/adapter/in/web/attachment.scenario.spec.ts:49`, `web/src/attachment/domain/AttachmentUpload.spec.ts:27` |
| 10 | `조회 계정은 올릴 수 없고(403) 이력도 늘지 않는다` | R-015 | char-kpi.test.js | 새로 씀 | `web/src/attachment/adapter/in/web/attachmentHistory.char.spec.ts` 의 마지막 케이스(이력 행 수 불변). 기존: `attachment.scenario.spec.ts:120` |
| 11 | `KST 월 경계·기한 날짜·분모·테스트·삭제·잘못된 시각·중앙값` | R-017 R-021 R-022 R-023 | kpi-model.test.js | 있음 | `web/src/report/domain/MonthlyMetrics.spec.ts:12` |
| 12 | `형식이 어긋난 월(00·13·한 자리 …)은 400 이다` | R-017 | char-kpi.test.js | 있음 | `web/src/report/adapter/in/web/report.scenario.spec.ts:101`, `web/src/report/domain/ReportMonth.spec.ts:23` |
| 13 | `[R-020] assignee boundary: 1, 99, 100 chars …` | R-020 | char-tasks.test.js | 있음 | `web/src/assignment/adapter/in/web/assignment.scenario.spec.ts:38`, `:47`, `web/src/assignment/domain/AssigneeName.spec.ts:6` |
| 14 | `[R-020] assignee is trimmed before the length check …` | R-020 | char-tasks.test.js | 있음 | `web/src/assignment/domain/AssigneeName.spec.ts:19` |
| 15 | `무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외` | R-021 R-025 R-030 | kpi-model.test.js | 있음 | `web/src/automation/domain/automation.spec.ts:22`, `:57`, `:76`, `web/src/automation/adapter/in/web/automation.scenario.spec.ts:57` |
| 16 | `[R-021] flipping the data flag records the history sentence …` | R-021 | char-tasks.test.js | 새로 씀 | `web/src/assignment/adapter/in/web/assignmentHistory.char.spec.ts:60` |
| 17 | `[R-021] a non-boolean data flag gets 400 …` | R-021 | char-tasks.test.js | 있음 + 새로 씀 | `web/src/assignment/adapter/in/web/assignment.scenario.spec.ts:106`, `assignmentHistory.char.spec.ts`(이력 행 0 단언) |
| 18 | `[R-021] setting the same flag value again still writes a history row …` | R-021 | char-tasks.test.js | 새로 씀 | `web/src/assignment/adapter/in/web/assignmentHistory.char.spec.ts` 마지막 케이스 |
| 19 | `미래 월도 집계(미리보기)는 200 이고 막는 것은 발행뿐이다` | R-022 | char-kpi.test.js | 있음 | `web/src/report/adapter/in/web/report.scenario.spec.ts:101`, `web/src/report/domain/MonthlyMetrics.spec.ts:56` |
| 20 | `다음 달·먼 미래 월 발행은 400 이고 발행본이 늘지 않는다` | R-023 | char-kpi.test.js | 있음 | `web/src/report/adapter/in/web/report.scenario.spec.ts:74`, `web/src/report/application/service/PublishReportService.spec.ts:64` |
| 21 | `문안 20000자는 201 이고 20001자는 400 …` | R-023 | char-kpi.test.js | 있음 | `report.scenario.spec.ts:74`, `web/src/report/domain/ReportDraft.spec.ts:9`, `:15` |
| 22 | `지문이 다르면 월 검사보다 먼저 409 로 막는다` | R-023 | char-kpi.test.js | 있음 | `report.scenario.spec.ts:74`, `PublishReportService.spec.ts:43` |
| 23 | `공백만 있는 문안은 빈 문안으로 발행된다` | R-023 | char-kpi.test.js | 있음 | `report.scenario.spec.ts:74`, `ReportDraft.spec.ts:24`, `PublishReportService.spec.ts:77` |
| 24 | `PDF: 한글·A4·원시 집계값 제외·긴 문안 페이지 나눔` | R-024 | report-pdf.test.js | 새로 씀(+있음) | `web/src/report/adapter/in/web/ui/pdf/reportPdf.char.spec.ts:38`, `web/src/report/adapter/in/web/ui/pdf/createReportPdf.spec.ts:54`(`pdftotext` 비교는 `ORBIT_PDF_CHECK` 가 있을 때) |
| 25 | `KPI 브라우저: 추천·배정·첨부·월간 보고서·개선 관리대장·조회 계정` | R-024 | kpi-ui.test.js | 해당 없음 | 기존 `public/` 화면의 브라우저 시험. 화면 흐름은 web 의 `*Flow.spec.ts`(`assignmentFlow`, `attachmentFlow`, `reportFlow`, `improvementFlow`)가 맡는다. R-024 는 #24 로 다시 증거를 단다 |
| 26 | `필수 항목이 비었거나 단계·상태가 목록 밖이거나 …` | R-025 | char-kpi.test.js | 있음 | `web/src/improvement/domain/ImprovementValue.spec.ts:16`, `:24`, `:31`, `improvement.scenario.spec.ts:23` |
| 27 | `항목은 5000자까지 201 이고 앞뒤 공백을 지운 뒤 센다` | R-025 | char-kpi.test.js | 있음 | `web/src/improvement/adapter/in/web/improvement.scenario.spec.ts:70`, `ImprovementValue.spec.ts:37` |
| 28 | `모든 상태 삭제·조회 차단·복원·제목 확인 후 영구 삭제 및 최소 감사 기록` | R-026 R-027 | deletion.test.js | 있음 | `web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:164`, `:224`, `:256` |
| 29 | `설정 API 권한·버전 충돌·이력과 재시작 후 공통 설정 보존` | R-028 | settings.test.js | 있음 | `web/src/settings/adapter/in/web/settings.scenario.spec.ts:103`, `:109`, `:122`. 「재시작 후 보존」은 해당 없음(§4) |
| 30 | `경계값(문구 1000자 …)은 모두 200 으로 저장되고 버전이 하나씩 오른다` | R-028 | char-kpi.test.js | 있음 | `web/src/settings/adapter/in/web/settings.scenario.spec.ts:77` |
| 31 | `조회 계정은 저장할 수 없고(403) 읽기는 200 …` | R-028 | char-kpi.test.js | 있음 | `web/src/settings/adapter/in/web/settings.scenario.spec.ts:109` |
| 32 | `설정 입력 검증: 색상·이미지·중복·빈 항목·임의 필드 차단` | R-029 | settings.test.js | 있음 | `web/src/settings/domain/PortalSettings.spec.ts:10` |
| 33 | `잘못된 값은 모두 400 이고 버전과 이력이 그대로다` | R-029 | char-kpi.test.js | 있음 | `web/src/settings/adapter/in/web/settings.scenario.spec.ts:39` |
| 34 | `입력 검증은 버전 충돌 검사보다 먼저다 …` | R-029 | char-kpi.test.js | 있음 | `web/src/settings/adapter/in/web/settings.scenario.spec.ts:67` |
| 35 | `업무 수정: 모든 상태·권한·원본시각 보존·감사·충돌·유효성·삭제 업무 차단` | R-031 | task-edit.test.js | 있음 | `web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:47`~`:154` |
| 36 | `[R-031] an edit that changes nothing answers unchanged …` | R-031 | char-tasks.test.js | 있음 | `web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:71` |
| 37 | `[R-031] reason boundary: empty, whitespace-only and 1001 …` | R-031 | char-tasks.test.js | 있음 | `web/src/request/adapter/in/web/lifecycle.scenario.spec.ts:110`, `web/src/request/domain/TaskEdit.spec.ts:7` |
| 38 | `[R-032] 회사명 기본값과 저장된 이전 브랜딩은 갱신하고 사용자 설정은 보존` | R-032 | branding.test.js | 새로 씀(+있음) | `web/src/settings/domain/PortalBranding.char.spec.ts:8`, `web/src/settings/domain/PortalSettings.spec.ts:98`, `:102` |
| 39 | `[R-032] 개요 업무의 상태·기한 라벨, 미지정 표시와 모바일 배치를 확인` | R-032 | overview-labels.test.js | 해당 없음(일부 있음) | 기존 `public/` 개요 화면의 브라우저 시험. 상태 배지·기한 칸·미지정 배지는 `web/src/portal/adapter/in/web/ui/overview/overviewModel.spec.ts:92`, `:100`. 모바일 배치는 web 에 대응 시험이 없다(§5) |
| 40 | `[R-033] 기존 설정에도 고정업무를 제공하고 날짜 그룹은 KST 경계·기간·미완료를 구분` | R-033 | date-workflow.test.js | 있음 | `web/src/shared/domain/categories.spec.ts:6`, `web/src/board/domain/groupTasks.spec.ts:44`, `:170`, `:199` |
| 41 | `[R-033] 날짜 입력은 KST 자정으로 저장하고 기존 같은 날짜의 시각은 보존` | R-033 | date-workflow.test.js | 있음 | `web/src/shared/domain/kstDates.spec.ts:6`, `:14` |
| 42 | `[R-033] 고정업무 날짜 등록·날짜 검색·성공 시 팝업 종료·실패 시 유지` | R-033 | daily-board-ui.test.js | 해당 없음 | 제거되는 기존 보드 화면의 시험. 같은 동작의 로직은 `web/src/request/adapter/in/web/ui/create/createFlow.spec.ts:45`(등록 성공), `:64`(거절 시 닫지 않음), `groupTasks.spec.ts:44`(날짜 묶음) |
| 43 | `[R-034] 완료 업무는 한국 완료일로 이동하고 재개 업무는 요청일로 돌아온다` | R-034 | date-workflow.test.js | 있음 | `web/src/board/domain/groupTasks.spec.ts:58`, `:217`, `:223` |

## 3. 루트 시험 파일별 처분 (21)

| 파일 | 요구사항 인용 | 처분 | 근거 |
|---|---|---|---|
| board-model.test.js | R-011 | 있음 | §2 #4 #5 |
| board-ui.test.js | 없음 | 해당 없음: 제거되는 기존 보드 화면의 시험(파생 UI) | 인용하지 않으므로 증거를 옮길 일이 없다 |
| branding.test.js | R-032 | 새로 씀 | §2 #38 |
| char-kpi.test.js | R-015 R-017 R-022 R-023 R-025 R-028 R-029 | 있음 + 새로 씀 | §2 #8~#12, #19~#23, #26~#27, #30~#34. 요청 모양은 `test/golden/requests.js` 의 `ck-*` 가 되풀이하고 컨텍스트별 `*.parity.spec.ts` 가 녹화와 비교한다 |
| char-tasks.test.js | R-001 R-020 R-021 R-031 | 있음 + 새로 씀 | §2 #13 #14 #16~#18 #36 #37. 본문 한도(R-001)는 `ct-body-*` 라벨을 `request.parity.spec.ts:17` 이 되풀이한다 |
| daily-board-ui.test.js | R-033 | 해당 없음: 제거되는 기존 보드 화면의 시험(파생 UI) | §2 #42 |
| date-workflow.test.js | R-033 R-034 | 있음 | §2 #40 #41 #43 |
| deletion.test.js | R-026 R-027 | 있음 | §2 #28 |
| generated.test.js | 없음 | 남는다 | `supabase/upgrade.sql` 생성기 검사. `supabase/*.sql` 은 남기는 DB 계약이라 `scripts/check-generated.mjs` 와 함께 계속 돈다 |
| golden.test.js | R-001 R-002 R-003 R-006 R-009 (제목 1) | 있음 / 해당 없음 | `legacy behavior` = §2 #1(녹화 비교). `legacy assets are unchanged` = 해당 없음: `public/` 해시 고정이라 `public/` 과 함께 사라진다 |
| kpi-api.test.js | 여럿 | 새로 씀 | §2 #6 |
| kpi-model.test.js | R-017 R-021 R-022 R-023 R-025 R-030 | 있음 | §2 #11 #15 |
| kpi-ui.test.js | R-024 | 해당 없음: 기존 `public/` 화면의 브라우저 시험 | §2 #25 |
| legacy-boundary.test.js | 없음 | 해당 없음: 기존 파일 허용 목록 검사 | 기존 파일이 없어지면 대상이 없다 |
| overview-labels.test.js | R-032 | 해당 없음(일부 있음) | §2 #39 |
| parity.test.js | 없음 | 해당 없음: 서버·`public/`·SQL 사본 사이의 일치 검사 | 사본이 없어지면 대상이 없다. 설정 기본 분류 일치는 `web/src/settings/adapter/in/web/settings.scenario.spec.ts:37` 이 맡는다 |
| report-pdf.test.js | R-024 | 새로 씀(+있음) | §2 #24 |
| settings.test.js | R-028 R-029 | 있음 | §2 #29 #32 |
| supabase.test.js | R-010 R-015 R-020 R-025 R-026 R-027 R-028 R-031 | 있음 + 새로 씀 | 첫 시험은 §2 #3, 둘째는 §2 #7 |
| task-edit.test.js | R-031 | 있음 | §2 #35 |
| workflow.test.js | R-003 R-004 R-005 R-007 R-008 | 새로 씀 + 있음 | §2 #2 |

## 4. 해당 없음과 요구사항에 미치는 영향

| 해당 없음 | 영향받는 요구사항 | 처리 |
|---|---|---|
| 재시작 뒤 저장 보존(SQLite 파일을 닫고 다시 여는 시험: workflow, settings) | R-004 R-028 | 증거를 다시 단다. 보존은 PostgreSQL 이 소유하고 `web/src/shared/adapter/out/orbitSql.contract.spec.ts:17` 가 같은 SQL 을 새 데이터베이스에 두 번 적용해 이력·설정이 남는지 본다. 요구사항은 그대로 `current` |
| SQLite 로컬 저장소 전용 문장(담당자 배정 이력이 `미배정 → name`) | R-020 | 클라우드 SQL 함수는 이름만 기록한다(녹화 `web/src/parity/recorded/assignment-context.json`). 새 앱은 SQL 을 따른다. R-020 서술은 클라우드 동작을 기준으로 둔다 |
| 로컬 서버 시작 거절 `STORAGE_BACKEND` | R-010 | 이름이 `DATABASE_URL` 로 바뀐다. 서술을 바꾼다(`changed`): 운영에서 `DATABASE_URL` 이 없으면 시작하지 않는다. 증거 `web/src/config/startup.char.spec.ts:12` |
| 데이터베이스에 닿지 못할 때 로컬로 돌아가지 않는다는 것 | R-010 | 어댑터가 `server-only` 를 가져와 Next 빌드 밖에서는 시험하지 못한다. 서술은 코드 읽기로만 받친다(§5) |
| `public/` 해시 고정(`golden: legacy assets are unchanged`) | 없음(인용 안 됨) | 제목을 인용하는 요구사항이 없다 |
| 기존 보드·개요·KPI 화면의 Playwright 시험(board-ui, daily-board-ui, overview-labels, kpi-ui) | R-024 R-032 R-033 | 요구사항을 `dropped` 로 두지 않는다. 인용 제목(§2 #25 #39 #42)을 web 시험으로 바꿔 단다 |
| 기존 파일 허용 목록·복사본 일치 검사(legacy-boundary, parity) | 없음 | 인용하는 요구사항이 없다 |

## 5. 정직한 잔여

- 모바일 배치(R-032 의 세 번째 문장 일부)를 확인하는 web 시험이 없다. `web/src/portal/adapter/in/web/ui/portalCss.spec.ts:9` 는 스타일 파일이 바이트 단위로 같은지만 본다.
- 데이터베이스 연결 실패가 로컬 저장으로 바뀌지 않는다는 것은 시험하지 못했다.
- `ORBIT_PDF_CHECK` 가 없으면 `pdftotext` 로 읽는 케이스(`reportPdf.char.spec.ts:55`, `createReportPdf.spec.ts` 의 비교)가 건너뛴다.
- 이 표는 인용되는 시험 제목 43개를 모두 한 줄씩 다루지만, 제목 하나가 여러 `it` 을 묶는 경우(예: #6 #28 #35) web 대응은 묶음 전체가 아니라 같은 입력을 확인하는 시험들이다.
