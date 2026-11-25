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
 * Authoritative production Stillness archive manifest (15 selected photographs,
 * ordered strictly `stillness-01` through `stillness-15`).
 *
 * - Intrinsic dimensions match the verified EXIF-stripped private WebP files
 *   staged under `stillness/stillness-01.webp`..`stillness-15.webp`.
 * - No invented captions, dates, locations, or descriptions are added;
 *   `altText` provides a neutral accessible label only and is never rendered
 *   as a visible caption.
 */
export const STILLNESS_PHOTOS: readonly StillnessPhotoMetadata[] = [
  {
    id: "stillness-01",
    catalogId: "AU/I-01",
    assetKey: "arc-i-01",
    width: 722,
    height: 957,
    altText: "Photograph 01 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-02",
    catalogId: "AU/I-02",
    assetKey: "arc-i-02",
    width: 1080,
    height: 1920,
    altText: "Photograph 02 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-03",
    catalogId: "AU/I-03",
    assetKey: "arc-i-03",
    width: 1080,
    height: 608,
    altText: "Photograph 03 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-04",
    catalogId: "AU/I-04",
    assetKey: "arc-i-04",
    width: 1080,
    height: 1920,
    altText: "Photograph 04 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-05",
    catalogId: "AU/I-05",
    assetKey: "arc-i-05",
    width: 1080,
    height: 1920,
    altText: "Photograph 05 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-06",
    catalogId: "AU/I-06",
    assetKey: "arc-i-06",
    width: 1080,
    height: 1909,
    altText: "Photograph 06 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-07",
    catalogId: "AU/I-07",
    assetKey: "arc-i-07",
    width: 1290,
    height: 2796,
    altText: "Photograph 07 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-08",
    catalogId: "AU/I-08",
    assetKey: "arc-i-08",
    width: 941,
    height: 1024,
    altText: "Photograph 08 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-09",
    catalogId: "AU/I-09",
    assetKey: "arc-i-09",
    width: 1080,
    height: 1919,
    altText: "Photograph 09 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-10",
    catalogId: "AU/I-10",
    assetKey: "arc-i-10",
    width: 1290,
    height: 2796,
    altText: "Photograph 10 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-11",
    catalogId: "AU/I-11",
    assetKey: "arc-i-11",
    width: 1290,
    height: 2796,
    altText: "Photograph 11 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-12",
    catalogId: "AU/I-12",
    assetKey: "arc-i-12",
    width: 899,
    height: 1599,
    altText: "Photograph 12 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-13",
    catalogId: "AU/I-13",
    assetKey: "arc-i-13",
    width: 1080,
    height: 608,
    altText: "Photograph 13 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-14",
    catalogId: "AU/I-14",
    assetKey: "arc-i-14",
    width: 1080,
    height: 1920,
    altText: "Photograph 14 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
  {
    id: "stillness-15",
    catalogId: "AU/I-15",
    assetKey: "arc-i-15",
    width: 787,
    height: 708,
    altText: "Photograph 15 of 15 in Stillness",
    publishStatus: "ready",
    consentConfirmed: true,
  },
];

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
