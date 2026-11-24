import type { ReactNode } from "react";
import { ArchiveSoundtrackSync } from "@/components/audio/ArchiveSoundtrackSync";
import { resolveServerSoundtrackCatalog } from "@/lib/audio/availability";
import { requireSession } from "@/lib/auth/dal";

/**
 * Protected archive route-group layout.
 * Independently enforces server-side session authorization via the DAL,
 * never relying on proxy.ts alone.
 *
 * Syncs the server-resolved soundtrack catalog strictly inside the
 * authenticated archive tree so poem soundtrack metadata is never serialized
 * on the unauthenticated Threshold route (`/`).
 */
export default async function ProtectedArchiveLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireSession();
  const soundtrackCatalog = resolveServerSoundtrackCatalog();

  return (
    <>
      <ArchiveSoundtrackSync catalog={soundtrackCatalog} />
      {children}
    </>
  );
}
