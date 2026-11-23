import { EditorialIndex } from "@/components/index/EditorialIndex";
import { ARCHIVE_MOVEMENTS } from "@/content/movements";
import { requireSession } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

/**
 * Protected Editorial Index (`/archive`).
 * Independently enforces server-side session authorization via the DAL
 * (`requireSession`) in addition to the protected route-group layout and proxy.
 */
export default async function ArchiveIndexPage() {
  await requireSession();
  return <EditorialIndex movements={ARCHIVE_MOVEMENTS} />;
}
