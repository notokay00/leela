import type { VideoArtifact, VoiceArtifact } from "@/content/types";

export type VoicesAndFilmArtifact = VideoArtifact | VoiceArtifact;

/**
 * Movement III — Voices & Film artifact metadata.
 *
 * CONSENT DEFAULT:
 * All personal material defaults strictly to:
 *   publishStatus: "withheld"
 *   consentConfirmed: false
 *
 * Withheld assets are excluded from the media allowlist and cannot be served
 * until individually reviewed and explicitly approved.
 */
export const VOICES_AND_FILM_ARTIFACTS: readonly VoicesAndFilmArtifact[] = [
  {
    slug: "leela-poem-film",
    catalogId: "ARC-III-01",
    movement: "voices-and-film",
    kind: "video",
    title: "For You (Film)",
    // Opaque asset identifier — physical storage path is resolved server-side only.
    assetKey: "arc-iii-01-film",
    pairedArtifactSlug: "for-you-poem",
    publishStatus: "withheld",
    consentConfirmed: false,
    curatorialNote:
      "Preserved as a distinct archival film artifact. Withheld pending explicit review.",
  },
];
