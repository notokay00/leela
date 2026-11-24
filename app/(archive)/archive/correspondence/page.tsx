import type { Metadata } from "next";
import { CorrespondenceCatalogue } from "@/components/correspondence/CorrespondenceCatalogue";
import { LockArchiveButton } from "@/components/shell/LockArchiveButton";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import { CORRESPONDENCE_ARTIFACTS } from "@/content/artifacts/correspondence";
import { requireSession } from "@/lib/auth/dal";
import {
  selectApprovedCorrespondenceArtefacts,
  toCatalogueEntry,
} from "@/lib/correspondence/collection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Correspondence — The Archive of Us",
};

/**
 * Protected Correspondence Catalogue (`/archive/correspondence`).
 * Independently authenticates via the server-side DAL (`requireSession`) and
 * projects only individually consent-confirmed, ready literary artefacts.
 */
export default async function CorrespondencePage() {
  await requireSession();

  const approvedEntries = selectApprovedCorrespondenceArtefacts(
    CORRESPONDENCE_ARTIFACTS
  ).map(toCatalogueEntry);

  return (
    <main>
      <RoomTopBar
        tone="light"
        rightSlot={<LockArchiveButton tone="light" />}
      />
      <div className="pt-6 sm:pt-10">
        <CorrespondenceCatalogue
          entries={approvedEntries}
          basePath="/archive/correspondence"
        />
      </div>
    </main>
  );
}
