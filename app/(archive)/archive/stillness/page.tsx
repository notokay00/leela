import { LockArchiveButton } from "@/components/shell/LockArchiveButton";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import { StillnessRoom } from "@/components/stillness/StillnessRoom";
import {
  selectApprovedStillnessPhotos,
  STILLNESS_PHOTOS,
} from "@/content/artifacts/stillness";
import { requireSession } from "@/lib/auth/dal";
import { resolveApprovedMediaAsset } from "@/lib/media/registry";

export const dynamic = "force-dynamic";

/**
 * Protected Stillness Room (`/archive/stillness`).
 * Independently enforces server-side session authorization via the DAL
 * (`requireSession`) and filters photographs strictly through both metadata
 * consent status and the authoritative media registry allowlist.
 */
export default async function StillnessPage() {
  await requireSession();

  const approvedPhotos = selectApprovedStillnessPhotos(
    STILLNESS_PHOTOS,
    (assetKey) => resolveApprovedMediaAsset(assetKey) !== null
  );

  return (
    <main className="stillness-stage text-ink">
      <RoomTopBar catalogueRef="AU/I" rightSlot={<LockArchiveButton />} />
      <div className="pt-4 sm:pt-8">
        <StillnessRoom photos={approvedPhotos} />
      </div>
    </main>
  );
}
