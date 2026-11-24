import type { Metadata } from "next";
import { CadenzaRoom } from "@/components/cadenza/CadenzaRoom";
import { LockArchiveButton } from "@/components/shell/LockArchiveButton";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import { CADENZA_PASSAGES } from "@/content/artifacts/cadenza";
import { requireSession } from "@/lib/auth/dal";
import {
  buildCadenzaMoments,
  selectApprovedCadenzaPassages,
} from "@/lib/cadenza/collection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadenza — The Archive of Us",
};

/**
 * Protected Cadenza Room (`/archive/cadenza`).
 * Independently enforces server-side session authorization via the DAL
 * (`requireSession`) and renders only individually consent-confirmed passages.
 */
export default async function CadenzaPage() {
  await requireSession();

  const approvedPassages = selectApprovedCadenzaPassages(CADENZA_PASSAGES);
  const moments = buildCadenzaMoments(approvedPassages);

  return (
    <main className="flex flex-1 flex-col">
      <RoomTopBar
        tone="light"
        rightSlot={<LockArchiveButton tone="light" />}
      />
      <CadenzaRoom moments={moments} />
    </main>
  );
}
