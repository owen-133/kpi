'use client';

import { useState } from 'react';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { formatWhen } from '../../../../../shared/adapter/in/web/ui/format.ts';
import { assignTo, toggleTestData, type AssignmentDeps } from './assignmentFlow.ts';

export type AssignmentData = {
  readonly isTest: boolean;
  readonly assignedAt: string | null | undefined;
  readonly assignee: string | undefined;
};

/**
 * The data-kind line, the first assignment time and the assignee of the detail extensions (legacy bindTaskExtensions).
 * `reload` reads the detail anew and draws it again, which also replaces this section.
 */
export function AssignmentSection(p: { taskId: string; data: AssignmentData; editable: boolean; reload: () => Promise<void> }) {
  const { apis, actions } = usePortal();
  const [busy, setBusy] = useState(false);
  const deps: AssignmentDeps = {
    api: apis.assignment,
    toast: actions.toast,
    reload: p.reload,
    confirm: (message) => window.confirm(message),
    setBusy,
  };
  const { data } = p;
  return (
    <>
      <p>
        <span className="badge">{data.isTest ? '테스트 업무 · 지표 제외' : '실제 업무 · 지표 포함'}</span>
        {p.editable ? (
          <button type="button" className="text-button" id="toggle-test" onClick={() => void toggleTestData(p.taskId, data.isTest, deps)}>
            데이터 구분 변경
          </button>
        ) : null}
      </p>
      <p className="muted tiny">{`최초 배정 시각 ${data.assignedAt ? formatWhen(data.assignedAt) : '미배정'}`}</p>
      {p.editable ? (
        <form
          id="assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void assignTo(p.taskId, String(new FormData(event.currentTarget).get('assignee')), deps);
          }}
        >
          <div className="state-actions">
            <input name="assignee" aria-label="담당자" placeholder="담당자 이름" maxLength={100} defaultValue={data.assignee || ''} required />
            <button className="secondary" disabled={busy}>
              담당자 배정
            </button>
          </div>
        </form>
      ) : (
        <p>{data.assignee || '미배정'}</p>
      )}
    </>
  );
}
