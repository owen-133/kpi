'use client';

import type { ComponentType, RefObject } from 'react';
import { BoardView } from '../../../../../board/adapter/in/web/ui/BoardView.tsx';
import { ImprovementDialog } from '../../../../../improvement/adapter/in/web/ui/ImprovementDialog.tsx';
import { ImprovementsView } from '../../../../../improvement/adapter/in/web/ui/ImprovementsView.tsx';
import { CreateDialog } from '../../../../../request/adapter/in/web/ui/create/CreateDialog.tsx';
import { DetailDialog } from '../../../../../request/adapter/in/web/ui/detail/DetailDialog.tsx';
import { EditTaskDialog } from '../../../../../request/adapter/in/web/ui/edit/EditTaskDialog.tsx';
import { TrashDialog } from '../../../../../request/adapter/in/web/ui/trash/TrashDialog.tsx';
import { ReportView } from '../../../../../report/adapter/in/web/ui/ReportView.tsx';
import { SettingsDialog } from '../../../../../settings/adapter/in/web/ui/SettingsDialog.tsx';
import { DEFAULT_SETTINGS } from '../../../../../settings/domain/PortalSettings.ts';
import { ModalDialog } from '../../../../../shared/adapter/in/web/ui/ModalDialog.tsx';
import { OverviewView } from './overview/OverviewView.tsx';
import { usePortal } from './PortalContext.tsx';
import { DEFAULT_SHELL_TEXTS, bootFailureText, navLabels, pageHeading, shellTexts } from './shellTexts.ts';
import { DIALOG_NAMES, VIEWS, type DialogName, type View } from './shellState.ts';
import { Toast } from './Toast.tsx';

const NAV_ICON: Record<View, string> = { overview: '▦', board: '☷', report: '◷', improvements: '↗' };
const SCREEN: Record<View, ComponentType> = { overview: OverviewView, board: BoardView, report: ReportView, improvements: ImprovementsView };
// Body order of the legacy page.
const DIALOG_BODY: Record<DialogName, ComponentType> = {
  create: CreateDialog,
  improvement: ImprovementDialog,
  trash: TrashDialog,
  settings: SettingsDialog,
  edit: EditTaskDialog,
  detail: DetailDialog,
};
const DIALOG_ID: Record<DialogName, string> = {
  create: 'create-dialog',
  improvement: 'improvement-dialog',
  trash: 'trash-dialog',
  settings: 'settings-dialog',
  edit: 'edit-task-dialog',
  detail: 'detail-dialog',
};

/**
 * The page structure of the legacy index.html: aside, header, #content, footer, then the six dialogs and #toast as
 * siblings of the body in the legacy order. Screens fill #content and dialog bodies fill their dialogs.
 */
export function Shell(p: { applied: boolean; failure: string | null; toastRef: RefObject<HTMLDivElement | null> }) {
  const { boot, session, values, texts, state, actions } = usePortal();
  // Settings take effect only once both the session and the settings have arrived (legacy boot order).
  const { applied } = p;
  const words = applied ? shellTexts(values, session.role) : DEFAULT_SHELL_TEXTS;
  const labels = navLabels(applied ? texts : DEFAULT_SETTINGS.texts);
  // The header lines change when render() runs, which is when renderTick leaves 0 (first load or a menu click).
  const [breadcrumb, title, subtitle] = pageHeading(state.view, state.renderTick > 0 ? texts : DEFAULT_SETTINGS.texts);
  const admin = applied && session.role === 'admin';
  const Screen = SCREEN[state.view];
  return (
    <>
      <aside>
        <a className="brand" href="/">
          <b id="brand-logo">{applied && values.logo ? <img src={values.logo} alt={texts.portalName} /> : words.logoLetter}</b>
          <span>
            <span id="brand-name">{words.brandName}</span>
            <small id="brand-subtitle">{words.brandSubtitle}</small>
          </span>
        </a>
        <div className="workspace">
          <strong>{words.workspaceName}</strong>
          <small>{words.workspaceDescription}</small>
        </div>
        <label>{words.workspaceLabel}</label>
        <nav>
          {VIEWS.map((view) => (
            <button key={view} data-view={view} className={state.view === view ? 'active' : undefined} onClick={() => actions.navigate(view)}>
              {NAV_ICON[view]} <span>{labels[view]}</span>
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <span className="avatar">{words.profileInitials}</span>
          <div>
            {words.profileName}
            <small id="role-label">{words.roleLabel}</small>
          </div>
        </div>
      </aside>
      <div className="shell">
        <header>
          <span>
            {words.breadcrumbLabel}
            <i>/</i> <strong id="breadcrumb">{breadcrumb}</strong>
          </span>
          <div className="header-tools">
            <span className="live">{words.liveLabel}</span>
            <button id="open-trash" className="settings-button" hidden={!admin} aria-label="관리자 휴지통" title="관리자 휴지통" onClick={() => actions.open('trash')}>
              ▤ <span>휴지통</span>
            </button>
            <button id="admin-settings" className="settings-button" hidden={!admin} aria-label="관리자 설정" title="관리자 설정" onClick={() => actions.open('settings')}>
              ⚙ <span>설정</span>
            </button>
          </div>
        </header>
        <main>
          <section className="heading">
            <div>
              <p className="eyebrow">{words.pageEyebrow}</p>
              <h1 id="page-title">{title}</h1>
              <p id="page-subtitle">{subtitle}</p>
            </div>
            <button className="primary" id="new-task" onClick={() => actions.open('create')}>
              {words.newTaskButton}
            </button>
          </section>
          <div id="content">{boot === 'ready' ? <Screen key={state.renderTick} /> : boot === 'failed' && p.failure !== null ? bootFailureText(p.failure) : null}</div>
          <footer>{words.footer}</footer>
        </main>
      </div>
      {DIALOG_NAMES.map((name) => {
        const slot = state.dialogs[name];
        const Body = DIALOG_BODY[name];
        return (
          <ModalDialog key={name} id={DIALOG_ID[name]} open={slot.open} onClosed={() => actions.close(name)}>
            {slot.open ? <Body key={slot.tick} /> : null}
          </ModalDialog>
        );
      })}
      <Toast elementRef={p.toastRef} />
    </>
  );
}
