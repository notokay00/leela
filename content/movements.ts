import type { MovementSlug } from "@/content/types";

export interface ArchiveMovementEntry {
  slug: MovementSlug;
  numeral: "I" | "II" | "III" | "IV";
  title: string;
  catalogueRef: "AU/I" | "AU/II" | "AU/III" | "AU/IV";
  description: string;
  groundToken: "stillness" | "correspondence" | "voices-film" | "cadenza";
  /**
   * Only implemented rooms behave as active navigation links.
   * Unimplemented rooms retain equal visual weight without leading to
   * fabricated content or misleading placeholder experiences.
   */
  implemented: boolean;
}

export const ARCHIVE_COLLECTION_DESCRIPTION =
  "A collection of fragments and memories.";

export const ARCHIVE_MOVEMENTS: readonly ArchiveMovementEntry[] = [
  {
    slug: "stillness",
    numeral: "I",
    title: "Stillness",
    catalogueRef: "AU/I",
    description: "Photographs arranged on a darkroom light table.",
    groundToken: "stillness",
    implemented: false,
  },
  {
    slug: "correspondence",
    numeral: "II",
    title: "Correspondence",
    catalogueRef: "AU/II",
    description: "Poetry, letters, and pages kept in ink.",
    groundToken: "correspondence",
    implemented: false,
  },
  {
    slug: "voices-and-film",
    numeral: "III",
    title: "Voices & Film",
    catalogueRef: "AU/III",
    description: "Recordings and moving images held in the dark.",
    groundToken: "voices-film",
    implemented: false,
  },
  {
    slug: "cadenza",
    numeral: "IV",
    title: "Cadenza",
    catalogueRef: "AU/IV",
    description: "What remained unsaid.",
    groundToken: "cadenza",
    implemented: false,
  },
];

export function getMovementHref(movement: ArchiveMovementEntry): string | null {
  if (!movement.implemented) {
    return null;
  }
  return `/archive/${movement.slug}`;
}
