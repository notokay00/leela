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
    implemented: true,
  },
  {
    slug: "correspondence",
    numeral: "II",
    title: "Correspondence",
    catalogueRef: "AU/II",
    description: "Poetry, letters, and pages kept in ink.",
    groundToken: "correspondence",
    implemented: true,
  },
  {
    slug: "voices-and-film",
    numeral: "III",
    title: "Voices & Film",
    catalogueRef: "AU/III",
    description: "Voices, laughter, and moving moments kept close.",
    groundToken: "voices-film",
    implemented: true,
  },
  {
    slug: "cadenza",
    numeral: "IV",
    title: "Cadenza",
    catalogueRef: "AU/IV",
    description: "Things left unsaid.",
    groundToken: "cadenza",
    implemented: true,
  },
];

export function getMovementHref(movement: ArchiveMovementEntry): string | null {
  if (!movement.implemented) {
    return null;
  }
  return `/archive/${movement.slug}`;
}
