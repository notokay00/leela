"use client";

import { useEffect } from "react";
import type { ClientSoundtrackCatalog } from "@/lib/audio/soundtrack-types";
import { useAudio } from "./AudioProvider";

export interface ArchiveSoundtrackSyncProps {
  catalog: ClientSoundtrackCatalog;
}

/**
 * Lightweight client hydrator mounted strictly inside the authenticated
 * `(archive)` layout (`app/(archive)/layout.tsx`).
 *
 * Syncs the server-resolved soundtrack catalog (including all 23 poem-specific
 * metadata entries and their live approved availability) into the persistent
 * root `AudioProvider` without exposing poem metadata on the unauthenticated
 * Threshold route (`/`).
 */
export function ArchiveSoundtrackSync({ catalog }: ArchiveSoundtrackSyncProps) {
  const { syncSoundtrackCatalog } = useAudio();

  useEffect(() => {
    syncSoundtrackCatalog(catalog);
  }, [catalog, syncSoundtrackCatalog]);

  return null;
}
