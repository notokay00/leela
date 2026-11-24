export type SoundtrackScope = "archive" | "poem";

export type SoundtrackRightsApproval = "unverified" | "licensed" | "owned";

export type SoundtrackAvailability = "available" | "unavailable";

export type SoundtrackMimeType =
  | "audio/mpeg"
  | "audio/mp4"
  | "audio/wav"
  | "audio/ogg"
  | "audio/webm";

export type SoundtrackAudioFormat = "mp3" | "m4a" | "wav" | "ogg" | "webm";

export type SoundPreference = "unset" | "sound" | "silence";

/**
 * Authoritative soundtrack manifest record (separate from literary content).
 *
 * Musical licensing / hosting authorization (`rightsApproval`, `hostingApproved`)
 * is strictly separate from personal-media consent flags (`consentConfirmed`).
 * A track may exist as metadata before its authorized audio asset is supplied;
 * it is never playable until rights are approved AND its private asset exists
 * in the authorized media allowlist.
 */
export interface SoundtrackRecord {
  /** Unique internal soundtrack identifier (never displayed in visible UI). */
  readonly id: string;
  readonly scope: SoundtrackScope;
  /** Internal Correspondence poem ID (`correspondence-001`..), when scope === "poem". */
  readonly poemId?: string;
  /** Correspondence route slug (`for-you-poem`, `poem-002`..), when scope === "poem". */
  readonly poemSlug?: string;
  /** Genuine composition title (preserves exact user-supplied spelling & ellipses). */
  readonly title: string;
  /** Genuine artist or composer name. */
  readonly artist: string;
  /** Optional recording/performance identification (e.g. Grimethorpe performance). */
  readonly performance?: string;
  /** MIME type once an authorized source file is connected; null while unconnected. */
  readonly mimeType: SoundtrackMimeType | null;
  /** Container/codec format once an authorized source file is connected; null while unconnected. */
  readonly audioFormat: SoundtrackAudioFormat | null;
  /** Optional duration in seconds once the authorized recording is measured. */
  readonly durationSeconds?: number;
  /** Opaque private asset identifier for `/api/media/[assetKey]`. */
  readonly assetKey: string;
  /** Musical licensing/hosting status — distinct from personal-media consent. */
  readonly rightsApproval: SoundtrackRightsApproval;
  /** Explicit boolean gate confirming hosting/streaming rights are approved. */
  readonly hostingApproved: boolean;
  /**
   * Optional perceptual loudness trim multiplier in `(0.25, 1.0]` to prevent
   * startling loudness jumps between quiet classical and mastered tracks.
   */
  readonly gainMultiplier?: number;
}

/**
 * Sanitized client-safe soundtrack descriptor passed into `AudioProvider`.
 * Never exposes internal storage paths, raw rights flags, or poem catalogue codes.
 */
export interface ClientSoundtrackTrack {
  readonly id: string;
  readonly scope: SoundtrackScope;
  readonly poemSlug?: string;
  readonly title: string;
  readonly artist: string;
  readonly performance?: string;
  readonly mimeType: SoundtrackMimeType | null;
  readonly audioFormat: SoundtrackAudioFormat | null;
  readonly durationSeconds?: number;
  readonly availability: SoundtrackAvailability;
  readonly available: boolean;
  /** Authenticated `/api/media/<opaque-id>` stream path ONLY when approved and available. */
  readonly src: string | null;
  readonly gainMultiplier: number;
}

export interface ClientSoundtrackCatalog {
  readonly archiveTrack: ClientSoundtrackTrack;
  readonly poemTracks: readonly ClientSoundtrackTrack[];
}
