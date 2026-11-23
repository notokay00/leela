import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/dal";

/**
 * Protected archive route-group layout.
 * Independently enforces server-side session authorization via the DAL,
 * never relying on proxy.ts alone.
 */
export default async function ProtectedArchiveLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireSession();
  return <>{children}</>;
}
