import { notFound } from "next/navigation";
import { CorrespondenceCatalogue } from "@/components/correspondence/CorrespondenceCatalogue";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import {
  selectApprovedCorrespondenceArtefacts,
  toCatalogueEntry,
} from "@/lib/correspondence/collection";
import { SYNTHETIC_CORRESPONDENCE_FIXTURES } from "@/lib/correspondence/synthetic-fixtures";

export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT-ONLY visual & collection scalability harness for Correspondence.
 * Strictly unavailable in production (`NODE_ENV !== "development"` -> 404).
 * Never uses the original private poem or production artefact registry.
 */
export default function CorrespondenceDevHarnessPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const entries = selectApprovedCorrespondenceArtefacts(
    SYNTHETIC_CORRESPONDENCE_FIXTURES
  ).map(toCatalogueEntry);

  return (
    <main>
      <RoomTopBar tone="light" />
      <div className="pt-6 sm:pt-10">
        <CorrespondenceCatalogue
          entries={entries}
          basePath="/dev/correspondence-harness"
          isTestHarness
        />
      </div>
    </main>
  );
}
