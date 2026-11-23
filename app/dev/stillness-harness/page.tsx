import { notFound } from "next/navigation";
import { RoomTopBar } from "@/components/shell/RoomTopBar";
import { StillnessRoom } from "@/components/stillness/StillnessRoom";
import { SYNTHETIC_STILLNESS_FIXTURES } from "@/lib/stillness/synthetic-fixtures";

export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT-ONLY visual test harness for Stillness & The Living Light Table.
 * Strictly unavailable in production (`NODE_ENV !== "development"` -> 404).
 * Never uses personal media or the production media registry.
 */
export default function StillnessDevHarnessPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="stillness-stage text-ink">
      <RoomTopBar catalogueRef="TEST" />
      <div className="pt-4 sm:pt-8">
        <StillnessRoom photos={SYNTHETIC_STILLNESS_FIXTURES} isTestHarness />
      </div>
    </main>
  );
}
