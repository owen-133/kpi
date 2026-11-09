// Portal-wide settings: defaults, normalization of stored values and validation of a save request.
// Rules are those of the legacy portal (Owen's public/settings-model.js); messages are part of the contract.

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsValidationError';
  }
}

export type PortalSettings = {
  readonly texts: Readonly<Record<string, string>>;
  readonly categories: readonly string[];
  readonly channels: readonly string[];
  readonly priorities: readonly string[];
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly sidebarColor: string;
  readonly backgroundColor: string;
  readonly showBanner: boolean;
  readonly logo: string;
};

/** [key, label shown in error messages, default text] in display order. */
export const TEXT_FIELDS: ReadonlyArray<readonly [string, string, string]> = [
  ["portalName", "포털 이름", "아이지넷"],
  ["brandSubtitle", "로고 아래 설명", "총무 업무 포털"],
  ["logoLetter", "기본 로고 글자", "AI"],
  ["workspaceName", "워크스페이스 이름", "아이지넷 워크스페이스"],
  ["workspaceDescription", "워크스페이스 설명", "총무 업무를 연결하는 공간"],
  ["workspaceLabel", "메뉴 구역 제목", "WORKSPACE"],
  ["breadcrumbLabel", "상단 경로 이름", "Workspace"],
  ["liveLabel", "상단 상태 문구", "업무 워크스페이스"],
  ["profileName", "하단 프로필 이름", "아이지넷 총무"],
  ["profileInitials", "프로필 이니셜", "GA"],
  ["adminRole", "관리자 역할 문구", "총무 담당자 · 업무 관리"],
  ["viewerRole", "조회자 역할 문구", "팀장 · 조회 전용"],
  ["overviewMenu", "대시보드 메뉴", "Overview"],
  ["boardMenu", "업무 보드 메뉴", "업무 보드"],
  ["reportMenu", "업무 실적 메뉴", "업무 실적"],
  ["pageEyebrow", "페이지 상단 작은 제목", "AIJINET · GENERAL AFFAIRS"],
  ["overviewTitle", "대시보드 인사말", "좋은 하루예요, 총무 담당자님 ☀"],
  ["overviewSubtitle", "대시보드 안내", "작은 요청부터 중요한 업무까지, 오늘의 흐름을 한눈에."],
  ["boardTitle", "보드 페이지 제목", "모든 요청을 하나의 흐름으로"],
  ["boardSubtitle", "보드 페이지 안내", "접수부터 완료까지, 놓치는 업무 없이 관리하세요."],
  ["reportTitle", "실적 페이지 제목", "쌓인 기록이 업무의 성과로"],
  ["reportSubtitle", "실적 페이지 안내", "처리한 업무와 소요 시간을 데이터로 확인하세요."],
  ["newTaskLabel", "업무 등록 버튼", "새 업무 등록"],
  ["bannerEyebrow", "배너 작은 제목", "WORK SMARTER · EVERY DAY"],
  ["bannerTitle", "배너 제목", "일의 흐름이 보이면,\n하루가 더 명확해져요."],
  ["bannerDescription", "배너 설명", "흩어진 요청은 한곳에, 처리한 업무는 기록으로."],
  ["totalLabel", "전체 업무 지표", "전체 업무"],
  ["activeLabel", "진행 업무 지표", "진행 중"],
  ["completedLabel", "완료 업무 지표", "완료 업무"],
  ["overdueLabel", "기한 초과 지표", "기한 초과"],
  ["pendingTitle", "처리할 업무 제목", "지금 처리해야 할 업무"],
  ["pendingDescription", "처리할 업무 안내", "가까운 처리 기한 순으로 표시합니다. 업무를 눌러 이력을 확인하세요."],
  ["completionTitle", "완료율 제목", "업무 완료율"],
  ["recordTitle", "기록 안내 제목", "오늘도 기록으로 남겨요"],
  ["recordDescription", "기록 안내 설명", "구두로 받은 작은 요청도 업무입니다.\n접수 시점부터 처리 결과까지 차곡차곡 쌓아보세요."],
  ["cardEyebrow", "카드 보드 작은 제목", "GENERAL AFFAIRS · LIVE BOARD"],
  ["cardTitle", "카드 보드 제목", "흩어진 요청을, 한 장의 보드로."],
  ["cardDescription", "카드 보드 안내", "분류별로 모으고, 상태별로 살펴보세요."],
  ["createDescription", "등록창 안내", "구두·메신저로 받은 요청을 기록해 주세요."],
  ["categoryReportTitle", "분류별 실적 제목", "분류별 업무 현황"],
  ["processingReportTitle", "처리 기록 제목", "처리 기록"],
  ["monthlyReportTitle", "월간 보고서 제목", "월간 처리현황 리포트"],
  ["kpiQualityTitle", "기한·품질 패널 제목", "기한 도래 · 데이터 품질"],
  ["improvementLedgerTitle", "개선 관리대장 제목", "피드백 · 개선 이력 관리대장"],
  ["reportIssuanceTitle", "발행 이력 제목", "발행 이력"],
  ["improvementsMenu", "개선 이력 메뉴", "개선 이력"],
  ["improvementsTitle", "개선 이력 제목", "피드백을 개선으로, 개선을 성과로"],
  ["improvementsSubtitle", "개선 이력 안내", "MVP·실사용·정착 단계별 문제와 검증 결과를 기록하세요."],
  ["footer", "하단 안내", "아이지넷 · 요청부터 완료까지, 업무의 모든 순간을 기록합니다."],
];

const DEFAULT_TEXTS: Readonly<Record<string, string>> = Object.fromEntries(TEXT_FIELDS.map(([key, , value]) => [key, value]));

export const DEFAULT_SETTINGS: PortalSettings = {
  texts: DEFAULT_TEXTS,
  categories: ['일반 총무', '고정업무', '비품·자산', '구매·지출', '시설·환경', '계약', '복리후생', '기타'],
  channels: ['메신저', '구두', '이메일', '전화', '기타'],
  priorities: ['중', '상', '하'],
  primaryColor: '#26324e',
  accentColor: '#ff866f',
  sidebarColor: '#192238',
  backgroundColor: '#f5f6fb',
  showBanner: true,
  logo: '',
};

const MAX_TEXT_LENGTH = 1000;
const MAX_LIST_ITEMS = 30;
const MAX_ITEM_LENGTH = 50;
const MAX_LOGO_LENGTH = 280000;
const COLOR_KEYS = ['primaryColor', 'accentColor', 'sidebarColor', 'backgroundColor'] as const;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
// Raster images only: SVG can carry script, so it is never accepted as a logo.
const LOGO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const LIST_FIELDS = [
  ['categories', '업무 분류'],
  ['channels', '접수 경로'],
  ['priorities', '우선순위'],
] as const;
// Brand texts of the retired portal name: stored values equal to these are replaced by the current default.
const RETIRED_TEXTS: Readonly<Record<string, string>> = {
  portalName: 'orbit.ops',
  brandSubtitle: 'GENERAL AFFAIRS',
  logoLetter: 'o',
  workspaceName: 'MY WORKSPACE',
  profileName: '총무 워크스페이스',
  pageEyebrow: 'ORBIT OPS · GENERAL AFFAIRS',
};
const RETIRED_NAME = /orbit[. _-]*ops/gi;

type Loose = Record<string, unknown>;
type Normalized = Loose & { texts: Loose };

function spreadable(value: unknown): object {
  // Object spread ignores null, numbers and booleans; a string spreads into its characters, an array into its indexes.
  return value === null || value === undefined ? {} : (value as object);
}

/** Merges stored or submitted values over the defaults and rewrites the retired brand name inside texts. */
export function normalizeSettings(input: unknown = {}): Normalized {
  const source = spreadable(input) as Loose;
  const texts: Loose = { ...DEFAULT_TEXTS, ...spreadable(source.texts) };
  for (const [key, value] of Object.entries(texts)) {
    if (Object.hasOwn(RETIRED_TEXTS, key) && RETIRED_TEXTS[key] === value) texts[key] = DEFAULT_TEXTS[key];
    else if (typeof value === 'string') texts[key] = value.replace(RETIRED_NAME, '아이지넷');
  }
  return { ...DEFAULT_SETTINGS, ...source, texts };
}

function fail(message: string): never {
  throw new SettingsValidationError(message);
}

function validList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_LIST_ITEMS &&
    value.every((item) => typeof item === 'string' && item.trim() !== '' && item.length <= MAX_ITEM_LENGTH)
  );
}

/**
 * Checks a save request's `values` and returns the settings to store: defaults filled in, texts and list items trimmed.
 * Checks run in the legacy order, so the first failing rule decides the message.
 */
export function validateSettings(input: unknown): PortalSettings {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) fail('설정 형식을 확인하세요.');
  for (const key of Object.keys(input)) if (!Object.hasOwn(DEFAULT_SETTINGS, key)) fail('지원하지 않는 설정입니다.');
  // normalizeSettings always yields a plain texts object, so the legacy "texts is not an object" branch cannot be reached.
  const value = normalizeSettings(input);
  for (const key of Object.keys(value.texts)) if (!Object.hasOwn(DEFAULT_TEXTS, key)) fail('지원하지 않는 문구입니다.');
  for (const [key, label] of TEXT_FIELDS) {
    const text = value.texts[key];
    if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_TEXT_LENGTH) fail(`${label}은 1~${MAX_TEXT_LENGTH}자로 입력하세요.`);
    value.texts[key] = text.trim();
  }
  for (const [key, label] of LIST_FIELDS) {
    const items = value[key];
    if (!validList(items)) fail(`${label}은 1~${MAX_LIST_ITEMS}개, 항목별 1~${MAX_ITEM_LENGTH}자로 입력하세요.`);
    const trimmed = items.map((item) => item.trim());
    if (new Set(trimmed).size !== trimmed.length) fail(`${label}에 중복 항목이 있습니다.`);
    value[key] = trimmed;
  }
  for (const key of COLOR_KEYS) {
    const color = value[key];
    if (typeof color !== 'string' || !COLOR_PATTERN.test(color)) fail('색상 형식을 확인하세요.');
  }
  if (typeof value.showBanner !== 'boolean') fail('배너 표시 설정을 확인하세요.');
  const logo = value.logo;
  if (typeof logo !== 'string' || logo.length > MAX_LOGO_LENGTH || (logo !== '' && !LOGO_PATTERN.test(logo))) {
    fail('로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.');
  }
  return value as unknown as PortalSettings;
}

/** A settings version is a non-negative integer (the first save of a fresh database is version 0). */
export function isSettingsRevision(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
