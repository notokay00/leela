import type { VoicesAndFilmArtefact } from "@/lib/voices-and-film/types";

export type { VoicesAndFilmArtefact as VoicesAndFilmArtifact };

/**
 * Movement III — Voices & Film authoritative production manifest.
 *
 * CONSENT & PUBLICATION DEFAULT:
 * Every personal recording defaults strictly to:
 *   publishStatus: "withheld"
 *   consentConfirmed: false
 *
 * Withheld recordings are excluded from both the media allowlist
 * (`lib/media/registry.ts`) and the Voices & Film room projection until
 * individually reviewed, stored outside the public repository, and explicitly
 * approved. Do not populate with synthetic, stock, or fabricated recordings.
 */
export const VOICES_AND_FILM_ARTIFACTS: readonly VoicesAndFilmArtefact[] = [
  {
    id: "arc-iii-01",
    slug: "leela-poem-film",
    catalogId: "ARC-III-01",
    movement: "voices-and-film",
    section: "ahhh-i-am-in-love-again",
    sectionOrder: 1,
    mediaType: "personal-video",
    mimeType: "video/mp4",
    // Opaque asset identifier — physical storage path is resolved server-side only.
    assetKey: "arc-iii-01-film",
    pairedArtifactSlug: "for-you-poem",
    publishStatus: "withheld",
    consentConfirmed: false,
  },
];
