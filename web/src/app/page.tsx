import { PortalApp } from "../portal/adapter/in/web/ui/PortalApp.tsx";

// Dynamic on purpose: the proxy's per-request CSP nonce is only put on Next's scripts when the page is rendered per request.
export const dynamic = "force-dynamic";

export default function Page() {
  return <PortalApp />;
}
