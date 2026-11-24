import type { PublishStatus } from "@/content/types";

/**
 * The three canonical sections of Movement III — Voices & Film, in display order.
 * Internal keys/slugs remain stable for routing and anchors; visitors see only
 * the exact human-facing `title` values without Roman numerals or AU/III codes.
 */
export type VoicesAndFilmSectionId =
  | "my-personal-singer"
  | "ahhh-i-am-in-love-again"
  | "noice";

export type VoicesAndFilmArtefactType =
  | "voice-screen-recording"
  | "personal-video";

export type VoicesAndFilmMimeType =
  | "video/mp4"
  | "video/webm"
  | "audio/mpeg"
  | "audio/mp4"
  | "audio/ogg"
  | "audio/wav"
  | "audio/webm";

export interface SourceMediaIntegrity {
  sha256?: string;
  byteLength?: number;
}

/**
 * Optional approved standalone audio derivative paired alongside an original
 * screen recording. Original screen recordings are NEVER discarded or replaced.
 */
export interface ApprovedAudioDerivativeRef {
  /** Opaque asset ID registered in `lib/media/registry.ts` (never a path). */
  assetKey: string;
  mimeType: Extract<
    VoicesAndFilmMimeType,
    "audio/mpeg" | "audio/mp4" | "audio/ogg" | "audio/wav" | "audio/webm"
  >;
  durationSeconds?: number;
  integrity?: SourceMediaIntegrity;
}

/**
 * Scalable content model for Movement III — Voices & Film.
 *
 * - Supports `voice-screen-recording` and `personal-video` across any number
 *   of future recordings without redesign.
 * - `title` and `description` are strictly optional and supplied ONLY when
 *   genuinely provided; never inferred from filenames or fabricated.
 * - All personal archive material defaults strictly to:
 *     publishStatus: "withheld"
 *     consentConfirmed: false
 */
export interface VoicesAndFilmArtefact {
  /** Stable internal identifier (never displayed as a visible catalogue code). */
  id: string;
  /** Stable URL/anchor slug for development or future deep linking. */
  slug: string;
  /** Internal archive reference preserved for compatibility; never rendered visibly. */
  catalogId: string;
  movement: "voices-and-film";
  section: VoicesAndFilmSectionId;
  /** Explicit display order within its section (ascending, stable). */
  sectionOrder: number;
  mediaType: VoicesAndFilmArtefactType;
  mimeType: VoicesAndFilmMimeType;
  /** Opaque source media identifier resolved server-side via `lib/media/registry.ts`. */
  assetKey: string;
  /** Optional opaque poster asset identifier (gated through `lib/media/registry.ts`). */
  posterAssetKey?: string;
  /** Original intrinsic pixel dimensions or ratio, when known from source media. */
  width?: number;
  height?: number;
  aspectRatio?: number;
  durationSeconds?: number;
  /** Optional approved audio derivative kept alongside the original screen recording. */
  audioDerivative?: ApprovedAudioDerivativeRef;
  /** Optional genuine title — omitted unless explicitly supplied. */
  title?: string;
  /** Optional genuine description — omitted unless explicitly supplied. */
  description?: string;
  /** Optional cross-room reference (e.g., paired poem slug). */
  pairedArtifactSlug?: string;
  /** Optional source-file integrity metadata (never exposed to clients). */
  integrity?: SourceMediaIntegrity;
  publishStatus: PublishStatus;
  consentConfirmed: boolean;
}

export interface VoicesAndFilmSectionDefinition {
  id: VoicesAndFilmSectionId;
  /** Exact visible human-facing section title. */
  title: string;
  /** Restrained section tone identifier used strictly for presentation styling. */
  treatment: "listening-alcove" | "playful-reel" | "standalone-feature";
  /** Optional restrained empty-state line; kept minimal and honest. */
  emptyNotice: string;
}

/**
 * Aspect-ratio presentation bucket mapped cleanly to static CSS classes so
 * original media proportions are preserved without inline `style=""` attributes
 * (strict nonce CSP compliance).
 */
export type MediaAspectClassKey =
  | "portrait-tall"
  | "portrait"
  | "square"
  | "landscape-classic"
  | "landscape-wide"
  | "natural";

/**
 * Sanitized client DTO passed to the Voices & Film room UI.
 * Contains ONLY approved public playback routes (`/api/media/<opaque-id>`),
 * never filesystem paths, consent flags, withheld items, or internal notes.
 */
export interface VoicesAndFilmClientItem {
  id: string;
  section: VoicesAndFilmSectionId;
  mediaType: VoicesAndFilmArtefactType;
  mimeType: VoicesAndFilmMimeType;
  src: string;
  posterSrc?: string;
  width?: number;
  height?: number;
  aspectClassKey: MediaAspectClassKey;
  durationSeconds?: number;
  audioDerivative?: {
    src: string;
    mimeType: ApprovedAudioDerivativeRef["mimeType"];
    durationSeconds?: number;
  };
  title?: string;
  description?: string;
}

export interface VoicesAndFilmSectionView {
  section: VoicesAndFilmSectionDefinition;
  items: readonly VoicesAndFilmClientItem[];
}
