import type {
  CorrespondenceArtefact,
  CorrespondenceCatalogueEntry,
  LiteraryArtefactType,
  LiteraryLanguage,
  LiteraryScript,
  ReaderNavigation,
} from "./types.ts";

/**
 * Independent consent and publication gate.
 * An artefact is visible in Correspondence ONLY when explicitly ready AND
 * individually consent-confirmed.
 */
export function isArtefactApproved(
  artefact: Pick<CorrespondenceArtefact, "publishStatus" | "consentConfirmed">
): boolean {
  return (
    artefact.publishStatus === "ready" && artefact.consentConfirmed === true
  );
}

/**
 * Stable sort by explicit `collectionOrder` ascending (never forced chronological
 * or alphabetical order). Ties preserve original array index.
 */
export function sortByCollectionOrder<
  T extends Pick<CorrespondenceArtefact, "collectionOrder">,
>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.collectionOrder !== b.item.collectionOrder) {
        return a.item.collectionOrder - b.item.collectionOrder;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * Selects only individually approved literary artefacts in explicit collection order.
 */
export function selectApprovedCorrespondenceArtefacts(
  artefacts: readonly CorrespondenceArtefact[]
): CorrespondenceArtefact[] {
  return sortByCollectionOrder(artefacts.filter(isArtefactApproved));
}

/**
 * Projects an approved artefact into catalogue-only metadata.
 * Never includes `originalText` or auto-generated excerpts.
 */
export function toCatalogueEntry(
  artefact: CorrespondenceArtefact
): CorrespondenceCatalogueEntry {
  return {
    id: artefact.id,
    slug: artefact.slug,
    catalogNumber: artefact.catalogNumber,
    collectionOrder: artefact.collectionOrder,
    type: artefact.type,
    ...(artefact.customTypeLabel !== undefined
      ? { customTypeLabel: artefact.customTypeLabel }
      : {}),
    ...(artefact.title !== undefined ? { title: artefact.title } : {}),
    ...(artefact.summary !== undefined ? { summary: artefact.summary } : {}),
    language: artefact.language,
    script: artefact.script,
    ...(artefact.languageLabel !== undefined
      ? { languageLabel: artefact.languageLabel }
      : {}),
    ...(artefact.createdAt !== undefined
      ? { createdAt: artefact.createdAt }
      : {}),
    hasTranslation: (artefact.translations?.length ?? 0) > 0,
  };
}

/**
 * Resolves a single approved artefact by slug.
 * Withheld, draft, unconsented, or missing slugs all return `null` identically
 * so withheld artefacts cannot be probed or distinguished from 404s.
 */
export function findApprovedArtefactBySlug(
  artefacts: readonly CorrespondenceArtefact[],
  slug: string
): CorrespondenceArtefact | null {
  if (!slug || typeof slug !== "string") {
    return null;
  }

  for (const artefact of artefacts) {
    if (artefact.slug === slug && isArtefactApproved(artefact)) {
      return artefact;
    }
  }

  return null;
}

/**
 * Computes Previous / Next navigation strictly across approved artefacts in
 * explicit collection order. Withheld artefacts are never surfaced, linked,
 * or hinted at in navigation.
 */
export function resolveReaderNavigation(
  approvedArtefacts: readonly CorrespondenceArtefact[],
  currentSlug: string
): ReaderNavigation {
  const ordered = sortByCollectionOrder(
    approvedArtefacts.filter(isArtefactApproved)
  );
  const index = ordered.findIndex((item) => item.slug === currentSlug);

  if (index === -1) {
    return {
      previous: null,
      next: null,
      position: 0,
      total: ordered.length,
    };
  }

  const prev = index > 0 ? toCatalogueEntry(ordered[index - 1]) : null;
  const next =
    index < ordered.length - 1 ? toCatalogueEntry(ordered[index + 1]) : null;

  return {
    previous: prev,
    next,
    position: index + 1,
    total: ordered.length,
  };
}

export function formatArtefactTypeLabel(
  type: LiteraryArtefactType,
  customTypeLabel?: string
): string {
  switch (type) {
    case "poem":
      return "Poem";
    case "letter":
      return "Letter";
    case "fragment":
      return "Fragment";
    case "other":
      return customTypeLabel?.trim() || "Literary Artefact";
  }
}

const KNOWN_LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi",
  hindi: "Hindi",
  en: "English",
  english: "English",
  "hi-en": "Hindi & English",
  ur: "Urdu",
  urdu: "Urdu",
};

export function formatLanguageMetadata(
  language: LiteraryLanguage,
  script: LiteraryScript,
  languageLabel?: string
): string {
  if (languageLabel?.trim()) {
    return languageLabel.trim();
  }

  const normalizedLang = language.toLowerCase();
  const baseName =
    KNOWN_LANGUAGE_NAMES[normalizedLang] ?? language.toUpperCase();
  if (
    script === "Devanagari" &&
    (normalizedLang === "hi" || normalizedLang === "hindi")
  ) {
    return "Hindi · Devanagari";
  }
  if (script === "Mixed") {
    return `${baseName} · Mixed Script`;
  }
  if (script && script !== "Latin") {
    return `${baseName} · ${script}`;
  }
  return baseName;
}

/**
 * Selects the semantic typographic CSS class for rendering literary text
 * strictly from explicit script/language metadata (never inferred from text).
 */
export function getReadingTextClass(
  script: LiteraryScript,
  language?: LiteraryLanguage
): string {
  const normalizedLang = language?.toLowerCase();
  if (
    script === "Devanagari" ||
    normalizedLang === "hi" ||
    normalizedLang === "hindi"
  ) {
    return "correspondence-verse-devanagari";
  }
  if (script === "Mixed" || normalizedLang === "hi-en") {
    return "correspondence-verse-mixed";
  }
  return "correspondence-verse-latin";
}

export interface CollectionIntegrityReport {
  valid: boolean;
  errors: string[];
}

/**
 * Validates structural invariants for a scalable Correspondence collection:
 * - unique `id`, `slug`, and `catalogNumber` (catalogue numbers never reused)
 * - finite positive `collectionOrder`
 * - non-empty `originalText`, `language`, and `script`
 */
export function validateCollectionIntegrity(
  artefacts: readonly CorrespondenceArtefact[]
): CollectionIntegrityReport {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const catalogNumbers = new Set<string>();

  for (const item of artefacts) {
    if (!item.id.trim()) {
      errors.push("Artefact has empty id");
    } else if (ids.has(item.id)) {
      errors.push(`Duplicate id: ${item.id}`);
    } else {
      ids.add(item.id);
    }

    if (!item.slug.trim()) {
      errors.push(`Artefact ${item.id} has empty slug`);
    } else if (slugs.has(item.slug)) {
      errors.push(`Duplicate slug: ${item.slug}`);
    } else {
      slugs.add(item.slug);
    }

    if (!item.catalogNumber.trim()) {
      errors.push(`Artefact ${item.id} has empty catalogNumber`);
    } else if (catalogNumbers.has(item.catalogNumber)) {
      errors.push(`Duplicate catalogNumber: ${item.catalogNumber}`);
    } else {
      catalogNumbers.add(item.catalogNumber);
    }

    if (
      !Number.isInteger(item.collectionOrder) ||
      item.collectionOrder < 1
    ) {
      errors.push(
        `Artefact ${item.id} has invalid collectionOrder: ${item.collectionOrder}`
      );
    }

    if (item.originalText.length === 0) {
      errors.push(`Artefact ${item.id} has empty originalText`);
    }

    if (!item.language.trim() || !item.script.trim()) {
      errors.push(`Artefact ${item.id} must specify explicit language and script`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
