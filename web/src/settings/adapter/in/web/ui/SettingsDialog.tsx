'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TEXT_FIELDS, type PortalSettings } from '../../../../domain/PortalSettings.ts';
import { queryKeys } from '../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { checkImageDecodes, readAsDataUrl } from './browserLogoReaders.ts';
import type { HistoryEntry } from './settingsChanges.ts';
import { loadHistory, openSettingsForm, pickLogo, resetSettings, saveSettings, type SettingsForm } from './settingsFlow.ts';

const LIST_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ['categories', '업무 분류'],
  ['channels', '접수 경로'],
  ['priorities', '우선순위'],
];
const COLOR_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ['primaryColor', '버튼 대표 색상'],
  ['accentColor', '강조·로고 색상'],
  ['sidebarColor', '사이드바 색상'],
  ['backgroundColor', '페이지 배경 색상'],
];
const INIT_SQL_URL = 'https://github.com/owen-133/kpi/blob/main/supabase/settings.sql';
const LOGO_STATUS_REMOVED = '기본 글자 로고 · 저장하면 적용됩니다.';
const logoStatusOf = (logo: string): string => (logo ? '등록된 로고 이미지가 있습니다.' : '기본 글자 로고 사용 중');

/** The body of #settings-dialog: reads the settings anew when it opens (a failed read toasts and closes), then draws the form. */
export function SettingsDialog() {
  const { apis, actions } = usePortal();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm | null>(null);
  useEffect(() => {
    let current = true;
    const read = () => queryClient.fetchQuery({ queryKey: queryKeys.settings, queryFn: () => apis.settings.get(), staleTime: 0 });
    void openSettingsForm(read, actions).then((opened) => {
      if (current) setForm(opened);
    });
    return () => {
      current = false;
    };
  }, [apis, actions, queryClient]);
  return form === null ? null : <SettingsBody form={form} />;
}

/** Holds the draft; a reset draws the whole form anew from the defaults (error, history and logo note start over). */
function SettingsBody(p: { form: SettingsForm }) {
  const [draft, setDraft] = useState<PortalSettings>(p.form.draft);
  const [drawn, setDrawn] = useState(0);
  return (
    <DrawnForm
      key={drawn}
      form={p.form}
      draft={draft}
      onReset={(defaults) => {
        setDraft(defaults);
        setDrawn((n) => n + 1);
      }}
    />
  );
}

type ShownError = { readonly message: string };

function DrawnForm(p: { form: SettingsForm; draft: PortalSettings; onReset: (defaults: PortalSettings) => void }) {
  const { apis, actions } = usePortal();
  const queryClient = useQueryClient();
  const { draft, form: config } = p;
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const logo = useRef(draft.logo);
  const readingLogo = useRef(false);
  const [error, setError] = useState<ShownError | null>(null);
  const [logoStatus, setLogoStatus] = useState(logoStatusOf(draft.logo));
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (error !== null) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);
  useEffect(() => {
    if (history !== null) historyRef.current?.scrollIntoView({ block: 'start' });
  }, [history]);

  const showError = (message: string) => setError({ message });

  const onLogoFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    readingLogo.current = true;
    try {
      const choice = await pickLogo(file, { readDataUrl: () => readAsDataUrl(file), checkImage: checkImageDecodes });
      if ('error' in choice) {
        showError(choice.error);
        if (choice.clearInput) input.value = '';
      } else {
        logo.current = choice.url;
        setLogoStatus(choice.status);
      }
    } finally {
      readingLogo.current = false;
    }
  };

  const onHistory = async () => {
    const read = () => queryClient.fetchQuery({ queryKey: queryKeys.settingsHistory, queryFn: () => apis.settings.history(), staleTime: 0 });
    const loaded = await loadHistory(read);
    if ('error' in loaded) showError(loaded.error);
    else setHistory(loaded.entries);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readingLogo.current) {
      showError((await saveSettings({ api: apis.settings, actions, form: new FormData(e.currentTarget), logo: logo.current, revision: config.revision, readingLogo: true })) ?? '');
      return;
    }
    setSaving(true);
    const message = await saveSettings({
      api: apis.settings,
      actions,
      form: new FormData(formRef.current ?? e.currentTarget),
      logo: logo.current,
      revision: config.revision,
      readingLogo: false,
    });
    if (message !== null) showError(message);
    setSaving(false);
  };

  return (
    <form id="settings-form" ref={formRef} onSubmit={(e) => void onSubmit(e)}>
      <div className="dialog-head">
        <div>
          <p className="eyebrow">ADMIN SETTINGS</p>
          <h2>관리자 설정</h2>
        </div>
        <button type="button" className="close" data-close="settings-dialog" aria-label="닫기" onClick={() => actions.close('settings')}>
          ×
        </button>
      </div>
      <p className="muted tiny">저장하면 모든 사용자에게 적용됩니다. 기존 업무 내용은 바뀌지 않습니다. 설정 이력에는 현재 공용 계정인 admin이 기록됩니다.</p>
      {config.available ? null : (
        <div className="notice">
          {config.message || 'DB 초기화가 필요합니다.'}{' '}
          <a href={INIT_SQL_URL} target="_blank" rel="noreferrer">
            초기화 SQL 열기 ↗
          </a>
        </div>
      )}
      <div className="settings-tabs">
        <a href="#settings-words">화면 문구</a>
        <a href="#settings-options">업무 항목</a>
        <a href="#settings-design">디자인</a>
        <button type="button" id="settings-history" onClick={() => void onHistory()}>
          변경 이력
        </button>
      </div>
      <section id="settings-words">
        <h3>화면 문구와 메뉴</h3>
        <div className="form-grid">
          {TEXT_FIELDS.map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea name={'text_' + key} rows={draft.texts[key]?.includes('\n') ? 3 : 2} maxLength={1000} required defaultValue={draft.texts[key]} />
            </label>
          ))}
        </div>
      </section>
      <section id="settings-options">
        <h3>업무 선택 항목</h3>
        <p className="muted tiny">
          한 줄에 하나씩 입력하세요. 첫 번째 항목이 기본값입니다. 항목을 삭제해도 기존 업무와 이력은 유지됩니다. 상태 단계는 이력 호환성을 위해 고정입니다.
        </p>
        <div className="form-grid">
          {LIST_FIELDS.map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea name={key} rows={7} required defaultValue={(draft as unknown as Record<string, string[]>)[key]?.join('\n')} />
            </label>
          ))}
        </div>
      </section>
      <section id="settings-design">
        <h3>디자인</h3>
        <div className="form-grid">
          {COLOR_FIELDS.map(([key, label]) => (
            <label key={key}>
              {label}
              <input type="color" name={key} defaultValue={(draft as unknown as Record<string, string>)[key]} />
            </label>
          ))}
        </div>
        <label className="check-label">
          <input name="showBanner" type="checkbox" defaultChecked={draft.showBanner} />
          대시보드 배너 표시
        </label>
        <label>
          로고 이미지 (PNG·JPEG·WebP, 200KB 이하)
          <input type="file" id="logo-file" ref={fileRef} accept="image/png,image/jpeg,image/webp" onChange={(e) => void onLogoFile(e.currentTarget)} />
        </label>
        <p id="logo-status" className="muted tiny">
          {logoStatus}
        </p>
        <button
          type="button"
          id="remove-logo"
          className="secondary"
          onClick={() => {
            logo.current = '';
            if (fileRef.current) fileRef.current.value = '';
            setLogoStatus(LOGO_STATUS_REMOVED);
          }}
        >
          이미지 로고 제거
        </button>
      </section>
      <p id="settings-error" className="notice" role="alert" ref={errorRef} hidden={error === null}>
        {error?.message}
      </p>
      <div className="dialog-actions settings-actions">
        <button
          type="button"
          id="reset-settings"
          className="secondary"
          onClick={() => {
            const defaults = resetSettings((message) => window.confirm(message));
            if (defaults !== null) p.onReset(defaults);
          }}
        >
          기본값 불러오기
        </button>
        <button type="button" className="secondary" data-close="settings-dialog" onClick={() => actions.close('settings')}>
          취소
        </button>
        <button type="submit" className="primary" disabled={!config.available || saving}>
          설정 저장
        </button>
      </div>
      <div id="settings-history-content" ref={historyRef}>
        {history === null ? null : (
          <>
            <h3>최근 설정 변경 이력</h3>
            {history.length ? (
              history.map((entry, i) => (
                <div className="event" key={i}>
                  <small>
                    {entry.when} · {entry.actor}
                  </small>
                  <p>{entry.text}</p>
                </div>
              ))
            ) : (
              <p className="muted">변경 이력이 없습니다.</p>
            )}
          </>
        )}
      </div>
    </form>
  );
}
