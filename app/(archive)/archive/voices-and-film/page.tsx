import type { Metadata } from "next";
import { LockArchiveButton } from "@/components/shell/LockArchiveButton";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import { VoicesAndFilmRoom } from "@/components/voices-and-film/VoicesAndFilmRoom";
import { VOICES_AND_FILM_ARTIFACTS } from "@/content/artifacts/voices-and-film";
import { requireSession } from "@/lib/auth/dal";
import { resolveApprovedMediaAsset } from "@/lib/media/registry";
import { buildVoicesAndFilmSections } from "@/lib/voices-and-film/collection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Voices & Film — The Archive of Us",
};

/**
 * Protected Voices & Film Room (`/archive/voices-and-film`).
 * Independently enforces server-side session authorization via the DAL
 * (`requireSession`) and filters recordings strictly through both metadata
 * consent status and the authoritative server media allowlist.
 */
export default async function VoicesAndFilmPage() {
  await requireSession();

  const sections = buildVoicesAndFilmSections(
    VOICES_AND_FILM_ARTIFACTS,
    (assetKey) => resolveApprovedMediaAsset(assetKey) !== null
  );

  return (
    <main>
      <RoomTopBar
        tone="light"
        rightSlot={<LockArchiveButton tone="light" />}
      />
      <div className="pt-4 sm:pt-8">
        <VoicesAndFilmRoom sections={sections} />
      </div>
    </main>
  );
}
