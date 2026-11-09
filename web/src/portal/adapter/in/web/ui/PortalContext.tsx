'use client';

import { createContext, useContext } from 'react';
import type { PortalSettings } from '../../../../../settings/domain/PortalSettings.ts';
import type { SettingsEnvelope } from '../../../../../settings/adapter/in/web/ui/SettingsApi.ts';
import type { TaskSummary } from '../../../../../request/adapter/in/web/ui/RequestApi.ts';
import type { PortalApis } from './portalApis.ts';
import type { SessionView } from './PortalApi.ts';
import type { DialogName, ShellState, View } from './shellState.ts';

export type PortalActions = {
  /** 4 seconds, display:block set from script. */
  toast(message: string): void;
  /** GET tasks, store them, record the time, then render(). */
  refresh(): Promise<void>;
  /** An answer to GET tasks that the caller already holds (the Overview's 30 second refresh): store, record the time, render(). */
  applyFreshTasks(fresh: TaskSummary[]): void;
  /** The board's refresh: GET tasks and store them; no render. */
  reloadTasksQuietly(): Promise<TaskSummary[]>;
  /** renderTick + 1: the current screen mounts anew (keyed by the tick). */
  render(): void;
  navigate(view: View): void;
  /** Reads the task anew, then opens the detail dialog; a failure is thrown for the caller to toast. */
  openDetail(taskId: string): Promise<void>;
  open(d: DialogName, p?: { taskId?: string; itemId?: string | null }): void;
  close(d: DialogName): void;
  /** Stores the saved settings envelope and renders. */
  applySettings(saved: SettingsEnvelope): void;
  setReportMonth(month: string): void;
};

export type PortalBoot = 'loading' | 'ready' | 'failed';

export type PortalValue = {
  readonly boot: PortalBoot;
  /** Until the session answers this is a read-only placeholder; screens are only drawn when `boot` is 'ready'. */
  readonly session: SessionView;
  /** Settings merged over the defaults (what the legacy `config.values` held). */
  readonly values: PortalSettings;
  readonly texts: Readonly<Record<string, string>>;
  readonly tasks: TaskSummary[];
  readonly state: ShellState;
  readonly apis: PortalApis;
  readonly actions: PortalActions;
};

export const PortalContext = createContext<PortalValue | null>(null);

export function usePortal(): PortalValue {
  const value = useContext(PortalContext);
  if (value === null) throw new Error('usePortal() needs <PortalApp/> above it');
  return value;
}
