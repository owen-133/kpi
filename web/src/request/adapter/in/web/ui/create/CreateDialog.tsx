'use client';

import { useRef, useState, type FormEvent } from 'react';
import { AutomationBox } from '../../../../../../automation/adapter/in/web/ui/AutomationBox.tsx';
import { usePortal } from '../../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { todayKst } from '../../../../../../shared/adapter/in/web/ui/format.ts';
import { registrationCategories } from '../../../../../../shared/domain/categories.ts';
import { submitNewTask } from './createFlow.ts';

const options = (list: readonly string[]) =>
  list.map((value, i) => (
    <option key={i} value={value}>
      {value}
    </option>
  ));

/** The body of #create-dialog (legacy #create-form). The shell mounts it anew at every open, so the form starts empty with today as the request day. */
export function CreateDialog() {
  const { apis, actions, values, texts } = usePortal();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitNewTask(new FormData(e.currentTarget), { api: apis.request, actions, setBusy });
  };

  return (
    <form id="create-form" ref={formRef} onSubmit={onSubmit}>
      <div className="dialog-head">
        <div>
          <p className="eyebrow">NEW REQUEST</p>
          <h2>{texts.newTaskLabel}</h2>
        </div>
        <button type="button" className="close" data-close="create-dialog" aria-label="닫기" onClick={() => actions.close('create')}>
          ×
        </button>
      </div>
      <p className="muted">{texts.createDescription}</p>
      <label>
        업무 제목 *<input name="title" required maxLength={200} placeholder="어떤 요청을 받으셨나요?" />
      </label>
      <div className="form-grid">
        <label>
          요청자 *<input name="requester" required maxLength={100} placeholder="홍길동" />
        </label>
        <label>
          부서<input name="department" maxLength={100} placeholder="경영지원팀" />
        </label>
        <label>
          접수 경로<select name="channel">{options(values.channels)}</select>
        </label>
        <label>
          업무 분류<select name="category">{options(registrationCategories(values.categories))}</select>
        </label>
        <label>
          요청일 *<input name="requested_at" type="date" required defaultValue={todayKst()} />
        </label>
        <label>
          처리 기한<input name="due_date" type="date" />
        </label>
        <label>
          중요도<select name="priority">{options(values.priorities)}</select>
        </label>
      </div>
      <label>
        요청 내용<textarea name="description" rows={3} maxLength={10000} placeholder="요청 내용을 붙여 넣거나 상세 내용을 적어 주세요." />
      </label>
      <AutomationBox formRef={formRef} />
      <p className="muted tiny">요청일만 입력합니다. 경과시간은 선택일 00:00(한국 시간) 기준이며 등록·변경 시각은 서버에서 자동 기록합니다.</p>
      <div className="dialog-actions">
        <button type="button" className="secondary" data-close="create-dialog" onClick={() => actions.close('create')}>
          취소
        </button>
        <button className="primary" type="submit" disabled={busy}>
          업무 등록
        </button>
      </div>
    </form>
  );
}
