import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/dal";

/**
 * Protected Voices & Film Room Layout (`/archive/voices-and-film/**`).
 *
 * - Independently enforces server-side DAL authorization on every request.
 * - Mounts the warm sunlit studio ground for Movement III.
 */
export default async function VoicesAndFilmLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireSession();

  return (
    <div className="voices-film-stage voices-film-enter">
      <div className="voices-film-content-enter">{children}</div>
    </div>
  );
}
