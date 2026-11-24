import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CorrespondenceReader } from "@/components/correspondence/CorrespondenceReader";
import { LockArchiveButton } from "@/components/shell/LockArchiveButton";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import { CORRESPONDENCE_ARTIFACTS } from "@/content/artifacts/correspondence";
import { getSession, requireSession } from "@/lib/auth/dal";
import {
  findApprovedArtefactBySlug,
  resolveReaderNavigation,
  selectApprovedCorrespondenceArtefacts,
} from "@/lib/correspondence/collection";

export const dynamic = "force-dynamic";

type ReaderPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Generates page metadata without ever revealing withheld or unauthorized
 * artefact titles, slugs, or existence.
 */
export async function generateMetadata({
  params,
}: ReaderPageProps): Promise<Metadata> {
  const session = await getSession();
  if (!session) {
    return { title: "The Archive of Us" };
  }

  const { slug } = await params;
  const artefact = findApprovedArtefactBySlug(CORRESPONDENCE_ARTIFACTS, slug);
  if (!artefact) {
    return { title: "Correspondence — The Archive of Us" };
  }

  return {
    title: artefact.title
      ? `${artefact.title} (${artefact.catalogNumber}) — Correspondence`
      : `${artefact.catalogNumber} — Correspondence`,
  };
}

/**
 * Protected Individual Literary Artefact Reader (`/archive/correspondence/[slug]`).
 * Independently enforces server-side DAL authentication and strict consent
 * filtering; withheld or unknown slugs return 404 identically.
 */
export default async function CorrespondenceArtefactPage({
  params,
}: ReaderPageProps) {
  await requireSession();

  const { slug } = await params;
  const approved = selectApprovedCorrespondenceArtefacts(
    CORRESPONDENCE_ARTIFACTS
  );
  const artefact = findApprovedArtefactBySlug(approved, slug);

  if (!artefact) {
    notFound();
  }

  const navigation = resolveReaderNavigation(approved, artefact.slug);

  return (
    <main>
      <RoomTopBar
        catalogueRef={artefact.catalogNumber}
        tone="light"
        rightSlot={<LockArchiveButton tone="light" />}
      />
      <div className="pt-6 sm:pt-10">
        <CorrespondenceReader
          artefact={artefact}
          navigation={navigation}
          basePath="/archive/correspondence"
        />
      </div>
    </main>
  );
}
