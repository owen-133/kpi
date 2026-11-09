// The texts of the shell, taken from the portal settings the way the legacy `applySettings()` and `render()` of
// public/app.js did. Pure functions; the shell component only places the results.
import type { Role } from '../../../../../access/domain/Role.ts';
import { DEFAULT_SETTINGS, normalizeSettings, type PortalSettings } from '../../../../../settings/domain/PortalSettings.ts';
import type { View } from './shellState.ts';

type Texts = Readonly<Record<string, string>>;

/** The static page shows "● " before the live label; applySettings() replaces the whole element text and drops it. */
export const LIVE_BULLET = '● ';

export type ShellTexts = {
  readonly brandName: string;
  readonly brandSubtitle: string;
  readonly logoLetter: string;
  readonly workspaceName: string;
  readonly workspaceDescription: string;
  readonly workspaceLabel: string;
  readonly pageEyebrow: string;
  readonly footer: string;
  readonly liveLabel: string;
  readonly profileInitials: string;
  readonly roleLabel: string;
  /** Text node in front of the "/" of the header path, with its trailing space. */
  readonly breadcrumbLabel: string;
  readonly profileName: string;
  /** "＋ " + the button text. */
  readonly newTaskButton: string;
  readonly createTitle: string;
  readonly createDescription: string;
};

/** Stored settings merged over the defaults; what the browser gets from GET /api/settings goes through this. */
export function resolveSettings(stored: unknown): PortalSettings {
  return normalizeSettings(stored) as unknown as PortalSettings;
}

export const documentTitle = (texts: Texts): string => texts.portalName + ' · 총무 업무 포털';

/** What applySettings() writes. */
export function shellTexts(settings: PortalSettings, role: Role): ShellTexts {
  const t = settings.texts;
  return {
    brandName: t.portalName,
    brandSubtitle: t.brandSubtitle,
    logoLetter: t.logoLetter,
    workspaceName: t.workspaceName,
    workspaceDescription: t.workspaceDescription,
    workspaceLabel: t.workspaceLabel,
    pageEyebrow: t.pageEyebrow,
    footer: t.footer,
    liveLabel: t.liveLabel,
    profileInitials: t.profileInitials,
    roleLabel: t[role === 'viewer' ? 'viewerRole' : 'adminRole'],
    breadcrumbLabel: t.breadcrumbLabel + ' ',
    profileName: t.profileName,
    newTaskButton: '＋ ' + t.newTaskLabel,
    createTitle: t.newTaskLabel,
    createDescription: t.createDescription,
  };
}

/** The static index.html as served before any settings arrive (server-rendered page). */
export const DEFAULT_SHELL_TEXTS: ShellTexts = {
  ...shellTexts(DEFAULT_SETTINGS, 'admin'),
  liveLabel: LIVE_BULLET + DEFAULT_SETTINGS.texts.liveLabel,
  roleLabel: '업무 관리',
};

export function navLabels(texts: Texts): Record<View, string> {
  return {
    overview: texts.overviewMenu,
    board: texts.boardMenu,
    report: texts.reportMenu,
    improvements: texts.improvementsMenu,
  };
}

/** breadcrumb, page title and page subtitle that render() writes for a view. */
export function pageHeading(view: View, texts: Texts): readonly [string, string, string] {
  switch (view) {
    case 'overview':
      return [texts.overviewMenu, texts.overviewTitle, texts.overviewSubtitle];
    case 'board':
      return [texts.boardMenu, texts.boardTitle, texts.boardSubtitle];
    case 'report':
      return [texts.reportMenu, texts.reportTitle, texts.reportSubtitle];
    case 'improvements':
      return [texts.improvementsMenu, texts.improvementsTitle, texts.improvementsSubtitle];
  }
}

/** CSS variable and value pairs, in the order applySettings() sets them. */
export function colorVariables(settings: PortalSettings): ReadonlyArray<readonly [string, string]> {
  return [
    ['--primary', settings.primaryColor],
    ['--accent', settings.accentColor],
    ['--nav', settings.sidebarColor],
    ['--bg', settings.backgroundColor],
  ];
}

/** What `#content` shows when the first load fails. */
export const bootFailureText = (message: string): string => '데이터를 불러오지 못했습니다. ' + message;
