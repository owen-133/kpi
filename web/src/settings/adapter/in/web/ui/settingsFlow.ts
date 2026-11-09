// Flows of the admin settings dialog (legacy public/admin-settings.js). Pure TypeScript: the dialog passes the browser pieces in.
import { DEFAULT_SETTINGS, TEXT_FIELDS, normalizeSettings, validateSettings, type PortalSettings } from '../../../../domain/PortalSettings.ts';
import type { SettingsApi, SettingsEnvelope, SettingsHistoryEvent } from './SettingsApi.ts';
import { historyEntries, type HistoryEntry } from './settingsChanges.ts';

export const SAVED_TOAST = '관리자 설정이 저장되었습니다.';
export const LOGO_READING_MESSAGE = '로고 이미지를 읽는 중입니다. 잠시 후 저장하세요.';
export const LOGO_REFUSED_MESSAGE = '200KB 이하의 PNG·JPEG·WebP 파일을 선택하세요.';
export const RESET_CONFIRM_MESSAGE = '입력 중인 설정을 기본값으로 바꿀까요? 저장 전에는 다른 사용자에게 적용되지 않습니다.';

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX_BYTES = 200 * 1024;
const LIST_KEYS = ['categories', 'channels', 'priorities'] as const;
const COLOR_KEYS = ['primaryColor', 'accentColor', 'sidebarColor', 'backgroundColor'] as const;

/** The part of the portal actions this dialog uses. */
export type SettingsActions = {
  toast(message: string): void;
  applySettings(saved: SettingsEnvelope): void;
  close(dialog: 'settings'): void;
};

export type SettingsForm = {
  readonly draft: PortalSettings;
  readonly revision: number;
  readonly available: boolean;
  readonly message: string | undefined;
};

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Reads the settings anew. A failure is toasted and closes the dialog (the legacy dialog never opened then). */
export async function openSettingsForm(read: () => Promise<SettingsEnvelope>, actions: SettingsActions): Promise<SettingsForm | null> {
  try {
    const config = await read();
    return { draft: normalizeSettings(config.values) as unknown as PortalSettings, revision: config.revision, available: config.available, message: config.message };
  } catch (e) {
    actions.toast(messageOf(e));
    actions.close('settings');
    return null;
  }
}

/** The values the form currently holds, before validation. */
export function readSettingsValues(form: FormData, logo: string): unknown {
  return {
    texts: Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, String(form.get('text_' + key))])),
    ...Object.fromEntries(LIST_KEYS.map((key) => [key, String(form.get(key)).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)])),
    ...Object.fromEntries(COLOR_KEYS.map((key) => [key, form.get(key)])),
    showBanner: form.has('showBanner'),
    logo,
  };
}

/** Validates, saves with the opened revision, then applies, closes and toasts. Returns the error message to show, or null. */
export async function saveSettings(p: {
  api: SettingsApi;
  actions: SettingsActions;
  form: FormData;
  logo: string;
  revision: number;
  readingLogo: boolean;
}): Promise<string | null> {
  if (p.readingLogo) return LOGO_READING_MESSAGE;
  try {
    const values = validateSettings(readSettingsValues(p.form, p.logo));
    const saved = await p.api.save({ values, revision: p.revision });
    p.actions.applySettings(saved);
    p.actions.close('settings');
    p.actions.toast(SAVED_TOAST);
    return null;
  } catch (e) {
    return messageOf(e);
  }
}

export type LogoFile = { readonly name: string; readonly type: string; readonly size: number };
export type LogoReaders = { readDataUrl(file: LogoFile): Promise<string>; checkImage(url: string): Promise<void> };
export type LogoChoice = { url: string; status: string } | { error: string; clearInput?: true };

/** A chosen logo file: type and size are checked, then it is read and proven to decode as an image. */
export async function pickLogo(file: LogoFile, readers: LogoReaders): Promise<LogoChoice> {
  if (!LOGO_TYPES.includes(file.type) || file.size > LOGO_MAX_BYTES) return { error: LOGO_REFUSED_MESSAGE, clearInput: true };
  try {
    const url = await readers.readDataUrl(file);
    await readers.checkImage(url);
    return { url, status: file.name + ' · 저장하면 적용됩니다.' };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

/** After the user agrees, a copy of the defaults to draw the form from; otherwise null. */
export function resetSettings(confirmReset: (message: string) => boolean): PortalSettings | null {
  return confirmReset(RESET_CONFIRM_MESSAGE) ? structuredClone(DEFAULT_SETTINGS) : null;
}

export async function loadHistory(read: () => Promise<SettingsHistoryEvent[]>): Promise<{ entries: HistoryEntry[] } | { error: string }> {
  try {
    return { entries: historyEntries(await read()) };
  } catch (e) {
    return { error: messageOf(e) };
  }
}
