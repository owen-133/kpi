import type { ReactNode } from "react";
import { SITE_TITLE } from "./site.ts";

export const metadata = { title: SITE_TITLE };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
