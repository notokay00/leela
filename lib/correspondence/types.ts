import type { PublishStatus } from "../../content/types.ts";

/**
 * Supported literary artefact types for Correspondence (`AU/II`).
 * Letters, fragments, and other explicitly labelled literary artefacts
 * share common archival metadata without being forced into a poem-only format.
 */
export type LiteraryArtefactType = "poem" | "letter" | "fragment" | "other";

/**
 * Explicit language tag (BCP 47 or explicit multilingual tag such as "hi-en").
 * Open string union allows future languages without schema rewrites.
 */
export type LiteraryLanguage =
  | "hi"
  | "en"
  | "hi-en"
  | "ur"
  | (string & {});

/**
 * Explicit script identifier. Never inferred heuristically from text.
 */
export type LiteraryScript =
  | "Devanagari"
  | "Latin"
  | "Mixed"
  | "Nastaliq"
  | (string & {});

/**
 * Separate translation stored alongside an artefact without ever replacing
 * or modifying the immutable original text.
 */
export interface LiteraryTranslation {
  language: LiteraryLanguage;
  script: LiteraryScript;
  languageLabel: string;
  title?: string;
  text: string;
  translatorNote?: string;
}

/**
 * Common archival metadata shared across every Correspondence literary artefact.
 * Every optional field is genuinely optional and must never be fabricated.
 */
export interface LiteraryArtefactBase {
  /** Stable unique identifier independent of title or URL slug. */
  id: string;
  /** Stable URL slug for `/archive/correspondence/[slug]`. */
  slug: string;
  /** Permanent sequential catalogue number (e.g. `AU/II-001`). Never reused. */
  catalogNumber: string;
  /** Explicit curatorial collection order (independent of creation date). */
  collectionOrder: number;
  type: LiteraryArtefactType;
  /** Optional explicit label when `type === "other"`. */
  customTypeLabel?: string;
  /** Actual title, only when explicitly supplied. */
  title?: string;
  /** Short editorial summary, only when explicitly supplied. Never auto-excerpted. */
  summary?: string;
  /** Immutable original UTF-8 text preserving exact characters and line breaks. */
  originalText: string;
  /** Optional authoritative SHA-256 digest of UTF-8 `originalText` for source integrity checks. */
  originalTextSha256?: string;
  /** Explicit language metadata. */
  language: LiteraryLanguage;
  /** Explicit script metadata. */
  script: LiteraryScript;
  /** Optional human-readable language display label override. */
  languageLabel?: string;
  /** Optional genuine creation date, only when known. Never invented. */
  createdAt?: string;
  /** Optional separate translations; never replace `originalText`. */
  translations?: readonly LiteraryTranslation[];
  /** Optional editorial note, only when explicitly supplied. */
  editorialNote?: string;
  /** Optional cross-room reference (e.g. paired film or recording). */
  pairedArtifactSlug?: string;
  /** Mandatory independent publication and consent gate. */
  publishStatus: PublishStatus;
  consentConfirmed: boolean;
}

export interface PoemArtefact extends LiteraryArtefactBase {
  type: "poem";
}

export interface LetterArtefact extends LiteraryArtefactBase {
  type: "letter";
  salutation?: string;
  signOff?: string;
}

export interface FragmentArtefact extends LiteraryArtefactBase {
  type: "fragment";
  sourceContext?: string;
}

export interface OtherLiteraryArtefact extends LiteraryArtefactBase {
  type: "other";
}

export type CorrespondenceArtefact =
  | PoemArtefact
  | LetterArtefact
  | FragmentArtefact
  | OtherLiteraryArtefact;

/**
 * Projected public metadata rendered in the Correspondence editorial catalogue.
 * Intentionally omits `originalText` and `translations` so the full body of
 * every literary artefact lives exclusively on its individual reader route.
 */
export interface CorrespondenceCatalogueEntry {
  id: string;
  slug: string;
  catalogNumber: string;
  collectionOrder: number;
  type: LiteraryArtefactType;
  customTypeLabel?: string;
  title?: string;
  summary?: string;
  language: LiteraryLanguage;
  script: LiteraryScript;
  languageLabel?: string;
  createdAt?: string;
  hasTranslation: boolean;
}

export interface ReaderNavigation {
  previous: CorrespondenceCatalogueEntry | null;
  next: CorrespondenceCatalogueEntry | null;
  /** 1-based position within the approved collection. */
  position: number;
  total: number;
}
