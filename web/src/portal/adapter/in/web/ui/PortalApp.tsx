'use client';

import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TaskSummary } from '../../../../../request/adapter/in/web/ui/RequestApi.ts';
import type { SettingsEnvelope } from '../../../../../settings/adapter/in/web/ui/SettingsApi.ts';
import { DEFAULT_SETTINGS } from '../../../../../settings/domain/PortalSettings.ts';
import { createApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';
import type { SessionView } from './PortalApi.ts';
import { PortalContext, type PortalActions, type PortalBoot, type PortalValue } from './PortalContext.tsx';
import { createPortalApis } from './portalApis.ts';
import { createQueryClient } from './queryClient.ts';
import { queryKeys } from './queryKeys.ts';
import { Shell } from './Shell.tsx';
import { colorVariables, documentTitle, resolveSettings } from './shellTexts.ts';
import { initialShellState, shellReducer } from './shellState.ts';
import { useToast } from './Toast.tsx';

const NO_TASKS: TaskSummary[] = [];
// Placeholder until the session answers: read-only. Screens are not drawn before that.
const PENDING_SESSION: SessionView = { role: 'viewer', shared: true };

export function PortalApp() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <PortalRoot />
    </QueryClientProvider>
  );
}

function PortalRoot() {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(shellReducer, undefined, initialShellState);
  const { elementRef, toast } = useToast();
  const apis = useMemo(
    () => createPortalApis(createApiClient({ fetch: (input, init) => fetch(input, init), reload: () => window.location.reload() })),
    [],
  );

  // Boot in the legacy order: session, then settings, then tasks; each read waits for the one before it.
  const session = useQuery({ queryKey: queryKeys.session, queryFn: () => apis.portal.session() });
  const settings = useQuery({ queryKey: queryKeys.settings, queryFn: () => apis.settings.get(), enabled: session.isSuccess });
  const tasks = useQuery({ queryKey: queryKeys.tasks, queryFn: () => apis.request.listTasks(), enabled: settings.isSuccess });

  const failure = [session, settings, tasks].find((q) => q.isError)?.error ?? null;
  const boot: PortalBoot = failure !== null ? 'failed' : tasks.isSuccess ? 'ready' : 'loading';
  const applied = session.isSuccess && settings.isSuccess;
  const values = useMemo(() => (settings.data ? resolveSettings(settings.data.values) : DEFAULT_SETTINGS), [settings.data]);

  // applySettings() of the legacy page: title, colors and the viewer mark are set on the document from script.
  useEffect(() => {
    if (!applied) return;
    document.title = documentTitle(values.texts);
    for (const [name, color] of colorVariables(values)) document.documentElement.style.setProperty(name, color);
    document.body.classList.toggle('viewer', session.data?.role === 'viewer');
  }, [applied, values, session.data]);

  // The first successful load ends the legacy boot with refresh(): the time, then render().
  const booted = useRef(false);
  useEffect(() => {
    if (!tasks.isSuccess || booted.current) return;
    booted.current = true;
    dispatch({ type: 'refreshed', at: new Date().toISOString() });
    dispatch({ type: 'rendered' });
  }, [tasks.isSuccess]);

  const actions = useMemo<PortalActions>(() => {
    const storeTasks = async (): Promise<TaskSummary[]> => {
      const fresh = await apis.request.listTasks();
      queryClient.setQueryData(queryKeys.tasks, fresh);
      return fresh;
    };
    return {
      toast,
      refresh: async () => {
        await storeTasks();
        dispatch({ type: 'refreshed', at: new Date().toISOString() });
        dispatch({ type: 'rendered' });
      },
      applyFreshTasks: (fresh) => {
        queryClient.setQueryData(queryKeys.tasks, fresh);
        dispatch({ type: 'refreshed', at: new Date().toISOString() });
        dispatch({ type: 'rendered' });
      },
      reloadTasksQuietly: storeTasks,
      render: () => dispatch({ type: 'rendered' }),
      navigate: (view) => dispatch({ type: 'navigate', view }),
      openDetail: async (taskId) => {
        await queryClient.fetchQuery({ queryKey: queryKeys.task(taskId), queryFn: () => apis.request.getTask(taskId), staleTime: 0 });
        dispatch({ type: 'open', dialog: 'detail', taskId });
      },
      open: (dialog, p) => dispatch({ type: 'open', dialog, taskId: p?.taskId, itemId: p?.itemId }),
      close: (dialog) => dispatch({ type: 'closed', dialog }),
      applySettings: (saved: SettingsEnvelope) => {
        queryClient.setQueryData(queryKeys.settings, saved);
        dispatch({ type: 'rendered' });
      },
      setReportMonth: (month) => dispatch({ type: 'reportMonth', month }),
    };
  }, [apis, queryClient, toast]);

  const value: PortalValue = {
    boot,
    session: session.data ?? PENDING_SESSION,
    values,
    texts: values.texts,
    tasks: tasks.data ?? NO_TASKS,
    state,
    apis,
    actions,
  };
  return (
    <PortalContext.Provider value={value}>
      <Shell applied={applied} failure={failure === null ? null : failure.message} toastRef={elementRef} />
    </PortalContext.Provider>
  );
}
