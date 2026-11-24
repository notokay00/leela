import { notFound } from "next/navigation";
import { CorrespondenceReader } from "@/components/correspondence/CorrespondenceReader";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import {
  findApprovedArtefactBySlug,
  resolveReaderNavigation,
  selectApprovedCorrespondenceArtefacts,
} from "@/lib/correspondence/collection";
import { SYNTHETIC_CORRESPONDENCE_FIXTURES } from "@/lib/correspondence/synthetic-fixtures";

export const dynamic = "force-dynamic";

type HarnessReaderPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * DEVELOPMENT-ONLY individual artefact reader harness.
 * Strictly unavailable in production (`NODE_ENV !== "development"` -> 404).
 * Also returns 404 for withheld synthetic fixtures to mirror production rules.
 */
export default async function CorrespondenceDevHarnessReaderPage({
  params,
}: HarnessReaderPageProps) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { slug } = await params;
  const approved = selectApprovedCorrespondenceArtefacts(
    SYNTHETIC_CORRESPONDENCE_FIXTURES
  );
  const artefact = findApprovedArtefactBySlug(approved, slug);

  if (!artefact) {
    notFound();
  }

  const navigation = resolveReaderNavigation(approved, artefact.slug);

  return (
    <main>
      <RoomTopBar catalogueRef={artefact.catalogNumber} tone="light" />
      <div className="pt-6 sm:pt-10">
        <CorrespondenceReader
          artefact={artefact}
          navigation={navigation}
          basePath="/dev/correspondence-harness"
          isTestHarness
        />
      </div>
    </main>
  );
}
