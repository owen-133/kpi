import { REQUEST_STATUSES } from '../../../domain/RequestStatus.ts';
import { changeRequestStatusAction } from './actions.ts';
import type { RequestListItem } from './requestHandlers.ts';
import { STATUS_LABELS } from './statusLabels.ts';

export function RequestList({ requests }: { requests: readonly RequestListItem[] }) {
  if (requests.length === 0) {
    return <p>등록된 업무 요청이 없습니다.</p>;
  }
  return (
    <ul>
      {requests.map((request) => (
        <li key={request.id}>
          <strong>{request.title}</strong> — 요청자 {request.requester} — 상태 {STATUS_LABELS[request.status]}
          <form action={changeRequestStatusAction}>
            <input type="hidden" name="id" value={request.id} />
            <select name="status" defaultValue={request.status}>
              {REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <input name="reason" placeholder="사유 (완료·반려 건을 다시 열 때 필수)" />
            <button type="submit">상태 변경</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
