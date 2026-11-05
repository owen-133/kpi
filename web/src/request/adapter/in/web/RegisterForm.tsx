import { registerRequestAction } from './actions.ts';

export function RegisterForm() {
  return (
    <form action={registerRequestAction}>
      <h2>업무 요청 등록</h2>
      <p>
        <label>
          제목 <input name="title" required />
        </label>
      </p>
      <p>
        <label>
          요청자 <input name="requester" required />
        </label>
      </p>
      <button type="submit">등록</button>
    </form>
  );
}
