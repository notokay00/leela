import type { PublishStatus } from "@/content/types";

export type CadenzaLanguage = "en" | "hi" | "ur" | "mixed";
export type CadenzaScript = "Latin" | "Devanagari" | "Mixed";

/**
 * Authoritative content model for future genuine user-authored writing inside
 * Movement IV — Cadenza: Things Left Unsaid.
 *
 * - All personal writing defaults strictly to:
 *     publishStatus: "withheld"
 *     consentConfirmed: false
 * - `heading` is strictly optional; never synthesize "Untitled" or placeholder labels.
 * - `body` preserves exact UTF-8 characters and intentional line/paragraph breaks.
 */
export interface CadenzaPassage {
  /** Stable internal identifier (never rendered visibly). */
  id: string;
  /** Explicit display order (ascending, stable). */
  order: number;
  /** Optional genuine heading supplied by the author. */
  heading?: string;
  /** Verbatim author-supplied text, preserved without rewriting. */
  body: string;
  language?: CadenzaLanguage;
  script?: CadenzaScript;
  publishStatus: PublishStatus;
  consentConfirmed: boolean;
}

/**
 * Sanitized client DTO passed to the Cadenza room.
 * Strips consent/publication metadata so only approved passages reach the UI.
 */
export interface CadenzaClientPassage {
  id: string;
  heading?: string;
  body: string;
  script: CadenzaScript;
}

/**
 * Discriminated reflective moments presented in user-controlled sequence:
 * - `arrival`: quiet entry into the diffused daylight room.
 * - `passage`: a single genuine author-supplied passage (one moment per passage).
 * - `pause`: quiet open chamber rendered when no passages have been supplied yet.
 * - `conclusion`: dignified, open-ended ending with quiet Index return & archive exit.
 */
export type CadenzaMoment =
  | { kind: "arrival"; id: "arrival" }
  | { kind: "pause"; id: "pause" }
  | { kind: "passage"; id: string; passage: CadenzaClientPassage }
  | { kind: "conclusion"; id: "conclusion" };
