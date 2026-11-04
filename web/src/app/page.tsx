import { getContainer } from "../config/container.ts";
import { RegisterForm } from "../request/adapter/in/web/RegisterForm.tsx";
import { RequestList } from "../request/adapter/in/web/RequestList.tsx";
import { listRequestsHandler } from "../request/adapter/in/web/requestHandlers.ts";
import { SITE_TITLE } from "./site.ts";

export const dynamic = "force-dynamic";

export default async function Page() {
  const requests = await listRequestsHandler(getContainer());
  return (
    <main>
      <h1>{SITE_TITLE}</h1>
      <p>총무 업무 포털</p>
      <RegisterForm />
      <h2>업무 요청 목록</h2>
      <RequestList requests={requests} />
    </main>
  );
}
