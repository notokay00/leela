import "server-only";
import { resolveApprovedMediaAsset } from "../media/registry.ts";

/**
 * Opaque asset ID reserved for the authorized score recording
 * (Joaquín Rodrigo — Concierto de Aranjuez, II. Adagio).
 *
 * Licensing note:
 * No recording is bundled or enabled until rights are established and the
 * asset is explicitly approved (`publishStatus: "ready"`, `consentConfirmed: true`).
 */
export const ARCHIVE_SCORE_ASSET_ID = "arc-score-aranjuez";

export function isAuthorizedAudioConfigured(): boolean {
  return resolveApprovedMediaAsset(ARCHIVE_SCORE_ASSET_ID) !== null;
}
