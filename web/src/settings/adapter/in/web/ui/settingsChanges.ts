// The "recent settings changes" lines of the settings dialog (legacy public/admin-settings.js, #settings-history).
import { TEXT_FIELDS, normalizeSettings } from '../../../../domain/PortalSettings.ts';
import { formatWhen } from '../../../../../shared/adapter/in/web/ui/format.ts';
import type { SettingsHistoryEvent } from './SettingsApi.ts';

// Labels differ from the form's: colors read 대표 색상, not 버튼 대표 색상.
const OTHER_KEYS: ReadonlyArray<readonly [string, string]> = [
  ['categories', '업무 분류'],
  ['channels', '접수 경로'],
  ['priorities', '우선순위'],
  ['primaryColor', '대표 색상'],
  ['accentColor', '강조 색상'],
  ['sidebarColor', '사이드바 색상'],
  ['backgroundColor', '배경 색상'],
  ['showBanner', '배너 표시'],
];

export const NO_CHANGE_TEXT = '동일한 값 저장';

export type HistoryEntry = { readonly when: string; readonly actor: string; readonly text: string };

const shown = (value: unknown): string => ([] as unknown[]).concat(value).join(', ');

/** One line per changed setting, joined by newlines; stored values are normalized first. */
export function settingsChangeText(beforeStored: unknown, afterStored: unknown): string {
  const before = normalizeSettings(beforeStored);
  const after = normalizeSettings(afterStored);
  const changes: string[] = [];
  for (const [key, label] of TEXT_FIELDS) {
    if (before.texts[key] !== after.texts[key]) changes.push(`${label}: ${before.texts[key]} → ${after.texts[key]}`);
  }
  for (const [key, label] of OTHER_KEYS) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes.push(`${label}: ${shown(before[key])} → ${shown(after[key])}`);
  }
  if (before.logo !== after.logo) changes.push('로고 이미지 변경');
  return changes.join('\n') || NO_CHANGE_TEXT;
}

export function historyEntries(events: readonly SettingsHistoryEvent[]): HistoryEntry[] {
  return events.map((event) => ({ when: formatWhen(event.at), actor: event.actor, text: settingsChangeText(event.before, event.after) }));
}
