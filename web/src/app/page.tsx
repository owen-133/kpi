import { SITE_TITLE } from "./site.ts";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main>
      <h1>{SITE_TITLE}</h1>
      <p>총무 업무 포털</p>
      <p>화면은 이후 단계에서 이식합니다.</p>
    </main>
  );
}
