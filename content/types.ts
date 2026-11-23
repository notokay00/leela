export type MovementSlug =
  | "stillness"
  | "correspondence"
  | "voices-and-film"
  | "cadenza";

export type PublishStatus = "ready" | "draft" | "withheld";

export interface MovementDefinition {
  slug: MovementSlug;
  numeral: "I" | "II" | "III" | "IV";
  title: string;
  subtitle: string;
  curatorialNote: string;
}

export interface ArtifactBase {
  slug: string;
  catalogId: string;
  movement: MovementSlug;
  title: string;
  dateLabel?: string;
  curatorialNote?: string;
  publishStatus: PublishStatus;
  consentConfirmed: boolean;
  pairedArtifactSlug?: string;
}

export interface PhotoArtifact extends ArtifactBase {
  kind: "photo";
  assetKey: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface PoetryArtifact extends ArtifactBase {
  kind: "poetry";
  language: "hi" | "ur" | "en";
  script?: "Devanagari" | "Latin";
  /**
   * Preserved verbatim stanzas. Each stanza is an array of lines.
   */
  stanzas: readonly (readonly string[])[];
  rawText: string;
}

export interface LetterArtifact extends ArtifactBase {
  kind: "letter";
  salutation?: string;
  paragraphs: readonly string[];
  signOff?: string;
  handwrittenAccent?: string;
}

export interface DocumentArtifact extends ArtifactBase {
  kind: "document";
  assetKey?: string;
  alt?: string;
  width?: number;
  height?: number;
  excerpt?: string;
}

export interface VoiceArtifact extends ArtifactBase {
  kind: "voice";
  assetKey: string;
  durationSeconds?: number;
  transcript?: string;
}

export interface VideoArtifact extends ArtifactBase {
  kind: "video";
  assetKey: string;
  posterAssetKey?: string;
  captionsAssetKey?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export type ArchiveArtifact =
  | PhotoArtifact
  | PoetryArtifact
  | LetterArtifact
  | DocumentArtifact
  | VoiceArtifact
  | VideoArtifact;
