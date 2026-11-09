'use client';

import { Fragment, useState, type RefObject } from 'react';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import type { AutomationSuggestion } from './AutomationApi.ts';
import { applySuggestion, findSuggestions } from './automationFlow.ts';

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The `.automation-box` of the create dialog. It reads title and description from, and writes the category into, the form it sits in. */
export function AutomationBox(p: { formRef: RefObject<HTMLFormElement | null> }) {
  const { apis, actions } = usePortal();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AutomationSuggestion | null>(null);
  const field = (name: string) => p.formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

  const onSearch = async () => {
    const found = await findSuggestions(
      { title: field('title')?.value ?? '', description: field('description')?.value ?? '' },
      { api: apis.automation, toast: actions.toast, setBusy },
    );
    if (found !== null) setResult(found);
  };

  return (
    <div className="automation-box">
      <button type="button" className="secondary" id="automate-request" disabled={busy} onClick={() => void onSearch()}>
        자동 분류 · 유사 업무 찾기
      </button>
      <p className="muted tiny">키워드·텍스트 유사도 기반 · 생성형 AI 미사용 · 제안은 확인 후 적용</p>
      <div id="automation-results">
        {result === null ? null : (
          <>
            <p>
              {'추천 분류: '}
              <strong>{result.classification.category}</strong>{' '}
              <button
                type="button"
                className="secondary"
                id="accept-category"
                onClick={() =>
                  applySuggestion(
                    result.classification.category,
                    (category) => {
                      const select = field('category');
                      if (select) select.value = category;
                    },
                    actions.toast,
                  )
                }
              >
                분류 적용
              </button>
            </p>
            <p className="muted tiny">{result.classification.reason}</p>
            <h3>유사 업무</h3>
            {result.similar.length ? (
              result.similar.map((t, i) => (
                <Fragment key={t.id}>
                  {i > 0 ? <br /> : null}
                  <button
                    type="button"
                    className="text-button"
                    data-task={t.id}
                    onClick={() => actions.openDetail(t.id).catch((e: unknown) => actions.toast(messageOf(e)))}
                  >
                    {`${t.title} · ${t.status} · 유사도 ${t.score}%`}
                  </button>
                </Fragment>
              ))
            ) : (
              <p className="muted tiny">유사한 실제 업무가 없습니다.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
