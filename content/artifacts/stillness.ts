import type { PublishStatus } from "@/content/types";

/**
 * Structured Stillness photograph metadata.
 *
 * - `caption` (optional visible caption) and `altText` (required accessible
 *   description) are strictly separate fields. `altText` must NEVER be shown
 *   automatically as a visible caption.
 * - `capturedAt` stores only genuine recorded dates (`YYYY-MM-DD` or `YYYY-MM`).
 * - All personal archive material defaults strictly to:
 *     publishStatus: "withheld"
 *     consentConfirmed: false
 */
export interface StillnessPhotoMetadata {
  id: string;
  catalogId: string;
  assetKey: string;
  width: number;
  height: number;
  capturedAt?: string;
  caption?: string;
  altText: string;
  publishStatus: PublishStatus;
  consentConfirmed: boolean;
}

/**
 * Sanitized client DTO passed to the Stillness room UI.
 * Contains no filesystem paths or internal consent flags.
 */
export interface StillnessClientPhoto {
  id: string;
  catalogId: string;
  src: string;
  width: number;
  height: number;
  capturedAt?: string;
  caption?: string;
  altText: string;
}

/**
 * Authoritative production Stillness archive manifest.
 *
 * Currently empty: no personal photographs have been individually reviewed
 * and approved with explicit consent yet. Do not populate with stock images,
 * synthetic fixtures, or unreviewed personal files.
 */
export const STILLNESS_PHOTOS: readonly StillnessPhotoMetadata[] = [];

/**
 * Filters Stillness metadata strictly through both manifest consent status and
 * the authoritative media allowlist (`lib/media/registry.ts`).
 */
export function selectApprovedStillnessPhotos(
  photos: readonly StillnessPhotoMetadata[],
  isAssetApproved: (assetKey: string) => boolean
): StillnessClientPhoto[] {
  const approved: StillnessClientPhoto[] = [];

  for (const photo of photos) {
    if (
      photo.publishStatus !== "ready" ||
      photo.consentConfirmed !== true ||
      photo.width <= 0 ||
      photo.height <= 0 ||
      !isAssetApproved(photo.assetKey)
    ) {
      continue;
    }

    approved.push({
      id: photo.id,
      catalogId: photo.catalogId,
      src: `/api/media/${photo.assetKey}`,
      width: photo.width,
      height: photo.height,
      capturedAt: photo.capturedAt,
      caption: photo.caption,
      altText: photo.altText,
    });
  }

  return approved;
}
