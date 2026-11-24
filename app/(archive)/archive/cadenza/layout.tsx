import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/dal";

/**
 * Protected Cadenza Room Layout (`/archive/cadenza/**`).
 *
 * - Independently enforces server-side DAL authorization on every request.
 * - Mounts the quiet diffused-daylight alabaster ground for Movement IV.
 */
export default async function CadenzaLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireSession();

  return (
    <div className="cadenza-stage cadenza-ground-enter">
      <div className="cadenza-content-enter flex min-h-[100dvh] flex-col">
        {children}
      </div>
    </div>
  );
}
