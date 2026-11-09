# 화면 이식 설계

`PLAN.md` 의 화면 단계를 구현하는 설계다. 규칙은 `AGENTS.md`, 요구사항은 `docs/ssot/requirements.md` 가 소유한다. 여기서는 다시 적지 않는다.

## 1. 근거가 되는 사실

| # | 사실 | 출처 |
|---|---|---|
| F1 | 기존 포털은 `/` 한 쪽이다. 메뉴는 `<button data-view>` 이고 상태는 쪽 안에서 바뀐다. 대화상자 여섯과 토스트는 body 바로 아래 형제로 정해진 순서에 있다. | `public/index.html`, `public/app.js` |
| F2 | 비교 도구는 항상 `/` 를 열고 몸 전체의 접근성 트리와 제목을 비교한다. 버튼 자리에 링크가 있으면 구조 불일치다. | `scripts/compare-screens.mjs` |
| F3 | 동작 기록 스크립트는 기존 id·속성(`#content`, `#detail-dialog`, `#create-form`, `#status-form`, `#note-form`, `#task-file`, `#improvement-form`, `nav [data-view]`)으로 요소를 찾는다. 토스트는 `[role="status"][style*="block"]` 로 찾는다. | `scripts/capture-behavior.mjs` |
| F4 | CSP 는 `style-src 'self' 'nonce-…'` 이고 `'unsafe-inline'` 이 없다. 서버가 그린 HTML 의 style 속성은 버려지고 자바스크립트가 바꾸는 스타일은 된다. | `access/adapter/in/web/securityHeaders.ts` |
| F5 | 구조 검사는 `*/adapter/in/web/**` 에서 react·next·`@tanstack/*` 와 `'use client'` 를 이미 허용한다. 규칙 6 은 다른 쪽·다른 패키지 어댑터만 막는다. | `architecture.helpers.ts` |
| F6 | `style.css` 에는 `url()`, `@font-face`, 인쇄 규칙, 보드·흔적 이름이 없다. 화면 글꼴은 시스템 글꼴이다. | `public/style.css` |
| F7 | `public/pdf/report-pdf.js` 는 pdf-lib·fontkit 묶음이고 포털 코드는 끝 90줄(`createReportPdf`)이다. npm `pdf-lib`·`@pdf-lib/fontkit` 은 `web/package.json` 에 이미 고정돼 있다. | `public/pdf/report-pdf.js` |
| F8 | 클라이언트가 쓸 순수 로직은 새 도메인 폴더에 이미 있다: `report/domain`, `settings/domain`, `shared/domain`, `improvement/domain`, `board/domain`. | `web/src/*/domain` |
| F9 | 화면이 부르는 엔드포인트는 모두 새 API 에 있다. | `*/adapter/in/web/routes.ts` |
| F10 | 시험은 `node --test "src/**/*.spec.ts"` 이고 JSX 로더와 DOM 라이브러리가 없다. 시험은 `.ts` 만 쓰고 `.tsx` 를 import 하지 않는다. | `web/package.json` |

## 2. 결정

| # | 결정 |
|---|---|
| D1 | 경로는 `/` 하나. 화면(view)은 reducer 상태. `app/page.tsx` 는 서버 컴포넌트(`dynamic='force-dynamic'` 유지, 요청마다 nonce)이고 클라이언트 컴포넌트 `<PortalApp/>` 하나를 그린다. |
| D2 | 껍데기는 서버에서 기본 설정으로 그리고 `#content` 는 비운다(`index.html` 과 같다). 데이터는 브라우저에서 기존 순서(세션 → 설정 → 업무)로 이어서 불러온다. 시계·로케일·`window` 에 기대는 것은 데이터가 온 뒤에만 그린다. |
| D3 | 로그인은 `proxy.ts` 가 맡는다. 클라이언트는 기존대로 401 이면 새로고침하고 `로그인이 필요합니다.` 를 던진다. |
| D4 | 브라우저 코드는 `web/src/<컨텍스트>/adapter/in/web/ui/**`. 껍데기·Overview 는 `portal/…/ui/`, 공용은 `shared/…/ui/`. |
| D5 | 컨텍스트마다 `ui/` 에 타입 있는 API 클라이언트(`XxxApi` 인터페이스, `createXxxApi(client)`, JSON 뷰 타입)와 `ui/testing/fakeXxxApi.ts` 를 둔다. `application/port/out` 이 아니다. |
| D6 | TanStack Query 는 읽기만 맡는다. 쓰기는 일반 async 흐름 함수가 API 를 부른 뒤 `refresh()`/다시 열기를 기존 순서대로 한다. `useMutation` 을 쓰지 않는다. |
| D7 | 질의 기본값: `staleTime: Infinity, retry: false, refetchOnWindowFocus/Reconnect/Mount: false, refetchInterval: false`, 쓰기 `retry: false`. 세션·설정·업무는 앱 수명(`gcTime: Infinity`), 한 화면에 묶인 읽기는 `gcTime: 0` 이고 기존 `render()` 마다 화면을 다시 마운트해 로딩 문구가 다시 보이게 한다. 대화상자 읽기는 열 때 `fetchQuery({staleTime:0})`. |
| D8 | 화면 상태는 `useReducer`. 폼은 비제어이고 제출 때 `FormData` 로 읽어 기본 `required`/`maxlength` 검증이 기존처럼 동작한다. reducer 는 열림·tick·진행·오류만 든다. |
| D9 | 스타일은 `public/style.css` 를 바이트 그대로 `web/src/portal/adapter/in/web/ui/portal.css` 로 복사해 `app/layout.tsx` 에서 한 번 import 한다. 두 파일의 해시가 같음을 시험이 본다. 새 보드만 `*.module.css`. |
| D10 | `.tsx` 에 `style` prop 을 쓰지 않는다. 스타일 변경은 effect 안에서 ref 로 한다(완료 막대, 토스트, `<html>` 의 CSS 변수, `body.viewer`). 구조 검사 규칙 `STYLE` 이 막는다. |
| D11 | PDF: `createReportPdf` 를 TypeScript 로 옮겨 npm `pdf-lib`·`@pdf-lib/fontkit` 을 쓰고 클릭할 때 `import()` 로 불러온다. 글꼴은 `web/public/fonts/NanumGothic-Regular.ttf` 로 바이트 그대로 복사하고 해시 시험을 둔다. |
| D12 | UI 는 도메인 함수를 직접 쓰고 복사하지 않는다(`monthlyMetrics`, `currentMonth`, `normalizeSettings`, `validateSettings`, `TEXT_FIELDS`, `DEFAULT_SETTINGS`, `registrationCategories`, `requestTimestampFor`, `IMPROVEMENT_*`, `board/domain/*`). `ui/**` 는 어느 컨텍스트의 `domain/**` 와 다른 `ui/**` 만 import 한다. 날짜·`eventText`·CSV 칸 같은 표시 서식은 `ui/` 에 둔다. |
| D13 | CSV 칸 규칙 둘을 따로 둔다: 업무는 `/^[=+@-]/`, 개선 이력은 `/^[\s]*[=+@-]/`. 통일은 사용자 승인이 필요하다(PLAN §5). |
| D14 | 기존 Overview 의 30초 자동 갱신은 화면이 자체 타이머로 재현한다. TanStack 자동 재조회는 모두 끈다. |
| D15 | 아이콘(favicon)은 새로 그리기 전까지 두지 않는다. |

읽는 시점(기존과 같게):

| 질의 키 | 읽을 때 | 다시 읽을 때 |
|---|---|---|
| `['session']`, `['settings']` | 시작 | 설정 저장 때 응답으로 캐시를 바꾸고 `render()` |
| `['tasks']` | 시작 | 등록·상태·수정·삭제·복원·영구삭제 뒤 `refresh()`, Overview 30초, 보드 새로고침(`render` 없음). 메모·담당·시험 표시·파일 뒤에는 상세만 다시 읽는다 |
| `['task', id]` | 상세를 열 때마다 | 메모·담당·시험 표시·파일 추가/삭제·수정 저장 뒤 |
| `['trash']` | 휴지통을 열 때마다 | 복원·영구삭제 뒤 |
| `['report-preview', month]`, `['reports']` | 실적 화면을 마운트할 때마다 | 월 변경, 지표 새로 집계, 발행 뒤 |
| `['improvements']` | 개선 화면을 마운트할 때마다 | 저장 뒤 |
| `['lifecycle-history']`, `['settings-history']`, `['improvement-history', id]` | 버튼을 누를 때마다 | – |

## 3. 고정 계약

C1a·C1b 가 쓰고 화면 일감은 쓰기만 한다.

```ts
// shared/adapter/in/web/ui/apiClient.ts
export type ApiClient = { request<T>(path: string, body?: unknown): Promise<T> };   // body 가 truthy 일 때만 POST
export function createApiClient(deps: { fetch: typeof fetch; reload: () => void }): ApiClient;
// portal/adapter/in/web/ui/shellState.ts
export type View = 'overview' | 'board' | 'report' | 'improvements';
export type DialogName = 'create' | 'improvement' | 'trash' | 'settings' | 'edit' | 'detail';
export type DialogSlot = { open: boolean; tick: number; taskId?: string; itemId?: string | null };
export type ShellState = { view: View; renderTick: number; reportMonth: string | null; lastRefreshed: string; syncFailed: boolean; dialogs: Record<DialogName, DialogSlot> };
export type ShellAction = { type: 'navigate'; view: View } | { type: 'rendered' } | { type: 'refreshed'; at: string } | { type: 'syncFailed' }
  | { type: 'open'; dialog: DialogName; taskId?: string; itemId?: string | null } | { type: 'closed'; dialog: DialogName } | { type: 'reportMonth'; month: string };
export function shellReducer(state: ShellState, action: ShellAction): ShellState;
// portal/adapter/in/web/ui/PortalContext.tsx  → usePortal()
type PortalActions = {
  toast(message: string): void;                  // 4초, JS 로 display:block
  refresh(): Promise<void>;                      // GET tasks → setQueryData → refreshed(now) → render()
  reloadTasksQuietly(): Promise<TaskSummary[]>;  // 보드 새로고침: GET tasks + setQueryData 만
  render(): void;                                // renderTick++ → 현재 화면 재마운트(key)
  navigate(view: View): void;
  openDetail(taskId: string): Promise<void>;     // 새로 읽은 뒤 열기, 실패는 호출자가 토스트
  open(d: DialogName, p?: { taskId?: string; itemId?: string | null }): void; close(d: DialogName): void;
  applySettings(saved: SettingsEnvelope): void; setReportMonth(month: string): void;
};
// usePortal(): { boot: 'loading'|'ready'|'failed'; session; values: PortalSettings; texts; tasks; state; apis; actions }
// shared/adapter/in/web/ui/ModalDialog.tsx
export function ModalDialog(p: { id: string; open: boolean; onClosed: () => void; children?: ReactNode }): JSX.Element;
//   open && !el.open → showModal(); !open && el.open → close(); 기본 'close'(Escape) → onClosed()
```

화면 껍데기 위치(C1b 가 아무것도 그리지 않는 틀로 만들고 화면 일감이 채운다). 화면은 `#content` 안에서 `key={renderTick}` 로, 대화상자는 body 바로 아래 기존 순서(create, improvement, trash, settings, edit, detail)로 그리고 `<div id="toast" role="status">` 가 뒤따른다. 대화상자 본문은 `tick` 을 key 로 쓴다.

- `portal/adapter/in/web/ui/overview/OverviewView.tsx`
- `board/adapter/in/web/ui/BoardView.tsx`
- `report/adapter/in/web/ui/ReportView.tsx`
- `improvement/adapter/in/web/ui/{ImprovementsView,ImprovementDialog}.tsx`
- `request/adapter/in/web/ui/{create/CreateDialog,trash/TrashDialog,edit/EditTaskDialog,detail/DetailDialog}.tsx`
- `settings/adapter/in/web/ui/SettingsDialog.tsx`

모든 화면은 기존 id, `data-*`, 글자 노드, 간격을 그대로 둔다.

구조 검사 규칙 추가(C0): `UI` — `*/adapter/in/web/ui/**` 의 시험 아닌 파일은 `*/adapter/in/web/ui/**`, `*/domain/**`, `*.css`, UI 패키지(`react`, `react-dom`, `@tanstack/react-query`, `pdf-lib`, `@pdf-lib/fontkit`)만 import 한다. `STYLE` — `src` 의 시험 아닌 `.tsx` 에 `style={` 가 없다.

## 4. 일감

모든 일감의 공통 Done when(각각 파이프 없이 종료코드 0): `cd web && npm test` · `cd web && npx tsc --noEmit` · `cd web && npm run build` · 루트 `npm test`. 화면 일감은 `eval "$(node scripts/env-for-tests.mjs)" && node scripts/capture-behavior.mjs --target next --screen <id> --check` 도 종료코드 0 이어야 한다.

화면 일감은 **"비교 준비 완료"** 에서 멈춘다. `node scripts/compare-screens.mjs --screen <id> --start` 와 `verdict.md` 판정은 메인 세션이 하고 사용자 승인을 받는다.

| # | 목표 | 파일 | 선행 |
|---|---|---|---|
| C0 | UI·STYLE 구조 규칙 | `web/src/architecture.{spec,helpers}.ts`, `web/arch-fixtures/{ui-imports-routes,style-prop,good}/**`, `AGENTS.md` §3 한 줄, `docs/architecture.md` | – |
| C1a | API 클라이언트·뷰 타입·가짜·순수 UI 도우미 | `shared/adapter/in/web/ui/{apiClient,format,download}.ts`, 컨텍스트별 `ui/<Ctx>Api.ts` + `ui/testing/fake<Ctx>Api.ts`, `request/adapter/in/web/ui/tasksCsv.ts` | – |
| C1b | 껍데기·공급자·질의 클라이언트·CSS 복사·틀 | `web/src/app/{layout,page}.tsx`, `portal/adapter/in/web/ui/{PortalApp,Shell,PortalContext,Toast}.tsx`, `{shellState,shellTexts,queryClient,queryKeys}.ts`, `portal.css`, `shared/adapter/in/web/ui/ModalDialog.tsx`, 화면 틀 | C0, C1a |
| F | 사실 파일 기반 실행기 | `scripts/capture-behavior.mjs`(`--target legacy|next`), `scripts/capture-behavior.test.mjs`, `portal/testing/browserHarness.ts` | – |
| C2 | Overview + 30초 갱신 + KPI 띠 | `portal/adapter/in/web/ui/overview/**` | C1b, F |
| C3 | 설정 대화상자 | `settings/adapter/in/web/ui/**` | C1b, F |
| C4 | 휴지통 대화상자 | `request/adapter/in/web/ui/trash/**` | C1b, F |
| C5 | 개선 이력 화면·대화상자 | `improvement/adapter/in/web/ui/**` | C1b, F |
| C6 | 업무 실적 + PDF | `report/adapter/in/web/ui/**`, `web/public/fonts/NanumGothic-Regular.ttf` | C1b, F |
| C7 | 등록 대화상자 + 자동 분류 상자 | `request/adapter/in/web/ui/create/**`, `automation/adapter/in/web/ui/**` | C1b, F |
| C8 | 상세 대화상자, 담당, 첨부, 시험 표시 | `request/adapter/in/web/ui/detail/**`, `assignment/…/ui/**`, `attachment/…/ui/**` | C1b, F |
| C9 | 수정 대화상자 | `request/adapter/in/web/ui/edit/**` | C1b, F |
| C10 | 보드(클린룸, CSV 포함) | `board/adapter/in/web/ui/**` | C1b, F |

C0·C1a·F 가 먼저 병렬, 그다음 C1b, 그다음 C2~C10 이 병렬이다. 판정 순서는 Overview → PLAN 순서(설정, 휴지통, 개선, 실적, 등록, 상세, 수정, 보드)다. Overview 가 모든 대화상자 화면 뒤에 비쳐 보이므로 먼저 통과해야 한다.

C10(보드)의 입력은 `test/behavior/board.*`, 요구사항 정본, `web/src/board/domain/**`, 위 계약, 실행 중인 기존 보드를 브라우저로 본 관찰뿐이다. `PLAN.md` §4 의 경로와 `test/board-ui.test.js`, `test/daily-board-ui.test.js` 를 열지 않는다. 아이콘은 새로 그린다. 끝나면 `/usr/bin/grep -rIilE 'claude|svelte|third[-_ ]?party|오픈소스|notices' web/src/board` 가 아무것도 내지 않아야 한다.

## 5. 시험

- 단위(node:test): reducer, 뷰 모델, 서식, CSV, 설정 변경 문구, `eventText`, 질의 기본값, CSS·글꼴 해시. 시험 파일은 `.ts` 만.
- 흐름 시험(BDD): 각 `*Flow.ts` 는 `(apis, actions)` 를 받고 `ui/testing/fake*Api.ts` 와 호출 기록용 `actions` 가짜로 시험한다. 호출 순서와 토스트를 기존 줄에 맞춰 단언한다. 선언된 오류 문구마다 한 케이스, 부르면 안 되는 케이스를 부르는 케이스와 짝으로 둔다.
- 브라우저 시나리오: 화면마다 `<ctx>/adapter/in/web/ui/<screen>.browser.spec.ts`. `ORBIT_PLAYWRIGHT_PATH` 가 없으면 건너뛴다. 사용자 말로 이름을 쓴다.
- 사실 파일: 실행기 F 의 `--target next --check` 가 녹화한 상호작용을 그대로 재생해 `*.facts.json` 과 비교한다.
- 새 시험 라이브러리(jsdom, Testing Library)를 더하지 않는다.

## 6. 위험

- R1 Overview 가 대화상자 뒤에 비친다 — 대화상자 화면은 Overview 승인 전에는 통과하지 못한다.
- R2 Next 가 `<body>` 에 요소(경로 안내 등)를 더하면 모든 화면 구조 비교가 깨진다. 첫 Overview 비교 때 확인하고, 비교 도구를 고쳐 숨기지 않는다.
- R3 nonce CSP 와 하이드레이션: 쪽은 동적이어야 스크립트에 nonce 가 붙는다. 브라우저 시나리오로 확인한다.
- R4 `<dialog>` 는 `showModal()` 로만 연다. Escape 는 `close` 를 일으키므로 reducer 에 반영한다. 쌓임은 `showModal` 호출 순서를 따른다(수정은 상세 위, 상세는 휴지통 위).
- R5 PDF 는 NanumGothic 전체를 넣는다(약 2 MB). npm pdf-lib 와 묶음본의 배치가 다를 수 있어 텍스트 추출과 쪽 수로 비교한다.
- R6 `public/board/board.css` 가 보드 아닌 화면에 영향을 주는지는 읽을 수 없다. 의심되면 기존 쪽의 계산된 스타일을 브라우저로 본다.
- R7 UI 의 JSON 타입은 서버 뷰와 따로 적는다. 흐름이 어긋나면 사실 파일 실행기가 잡고 컴파일러는 못 잡는다.
- 한계: 이 설계는 코드를 읽어 만들었고 빌드·비교·기록을 돌리지 않았다. `frontend/src/report-pdf.js` 는 읽지 않아 묶음 끝부분과의 일치는 확인하지 않았다.
