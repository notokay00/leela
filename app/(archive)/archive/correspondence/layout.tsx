import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/dal";

/**
 * Protected Correspondence Room Layout (`/archive/correspondence/**`).
 *
 * - Independently enforces server-side DAL authorization on every request.
 * - Mounts the warm archival paper room ground with the 1.5s transition from
 *   dark rooms (`correspondence-ground-enter`) once upon entering Correspondence,
 *   so navigating between the catalogue and individual poems stays calmly on paper.
 */
export default async function CorrespondenceLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireSession();

  return (
    <div className="correspondence-stage correspondence-ground-enter">
      <div className="correspondence-content-enter">{children}</div>
    </div>
  );
}
