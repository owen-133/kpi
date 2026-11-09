import type { ReactNode } from "react";
import "../portal/adapter/in/web/ui/portal.css";
import "../portal/adapter/in/web/ui/nextAnnouncer.css";
import { PAGE_TITLE } from "./site.ts";

export const metadata = { title: PAGE_TITLE };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
