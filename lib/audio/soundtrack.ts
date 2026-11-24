import type { CorrespondenceArtefact } from "../correspondence/types.ts";
import { clampTrackGainMultiplier } from "./crossfade.ts";
import type {
  ClientSoundtrackCatalog,
  ClientSoundtrackTrack,
  SoundPreference,
  SoundtrackAudioFormat,
  SoundtrackMimeType,
  SoundtrackRecord,
} from "./soundtrack-types.ts";

/**
 * Extracts the single-segment poem slug from `/archive/correspondence/[slug]`.
 * Returns `null` on `/archive/correspondence` (catalogue), other rooms, or
 * multi-segment subpaths.
 */
export function extractCorrespondencePoemSlug(pathname: string): string | null {
  if (!pathname) {
    return null;
  }
  const cleanPath = pathname.split("?")[0]?.split("#")[0] ?? "";
  const trimmed =
    cleanPath.length > 1 && cleanPath.endsWith("/")
      ? cleanPath.slice(0, -1)
      : cleanPath;

  const prefix = "/archive/correspondence/";
  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  const remainder = trimmed.slice(prefix.length);
  if (!remainder || remainder.includes("/")) {
    return null;
  }

  try {
    return decodeURIComponent(remainder);
  } catch {
    return remainder;
  }
}

/**
 * Checks whether a soundtrack record is genuinely playable based on:
 * 1) Explicit musical hosting/licensing rights approval (strictly distinct
 *    from personal-media consent), AND
 * 2) Presence of an approved asset in the server media allowlist.
 *
 * An optional `syntheticOverride` is permitted ONLY in isolated test runs when
 * `ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES === "1"` and never in production.
 */
export function isSoundtrackRecordPlayable(
  record: SoundtrackRecord,
  isAssetApproved: (assetKey: string) => boolean,
  options?: { allowSyntheticOverride?: boolean }
): boolean {
  if (!record.assetKey || !isAssetApproved(record.assetKey)) {
    return false;
  }

  if (options?.allowSyntheticOverride) {
    return true;
  }

  return record.hostingApproved === true && record.rightsApproval !== "unverified";
}

export function inferAudioFormatFromMime(
  mimeType: string | null | undefined
): SoundtrackAudioFormat | null {
  switch (mimeType) {
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "audio/wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/webm":
      return "webm";
    default:
      return null;
  }
}

export function toClientSoundtrackTrack(
  record: SoundtrackRecord,
  resolvedAsset: {
    available: boolean;
    mimeType?: string | null;
    durationSeconds?: number;
  }
): ClientSoundtrackTrack {
  const available = resolvedAsset.available === true;
  const resolvedMime = (resolvedAsset.mimeType ??
    record.mimeType) as SoundtrackMimeType | null;
  const resolvedFormat =
    inferAudioFormatFromMime(resolvedMime) ?? record.audioFormat;

  return {
    id: record.id,
    scope: record.scope,
    ...(record.poemSlug ? { poemSlug: record.poemSlug } : {}),
    title: record.title,
    artist: record.artist,
    ...(record.performance ? { performance: record.performance } : {}),
    mimeType: available ? resolvedMime : null,
    audioFormat: available ? resolvedFormat : null,
    ...(resolvedAsset.durationSeconds !== undefined
      ? { durationSeconds: resolvedAsset.durationSeconds }
      : record.durationSeconds !== undefined
        ? { durationSeconds: record.durationSeconds }
        : {}),
    availability: available ? "available" : "unavailable",
    available,
    src: available ? `/api/media/${record.assetKey}` : null,
    gainMultiplier: clampTrackGainMultiplier(record.gainMultiplier),
  };
}

/**
 * Authoritative route-to-soundtrack resolution enforcing **Option A fallback**:
 *
 * - Outside individual poem routes (Threshold, Index, Stillness, Correspondence
 *   catalogue, Voices & Film, Cadenza): selects the archive-wide Rodrigo soundtrack.
 * - On an individual poem route (`/archive/correspondence/[slug]`):
 *   - If that poem has an assigned AND available soundtrack -> selects that poem's track.
 *   - If that poem's soundtrack is unavailable / unconnected -> falls back to the
 *     archive-wide Rodrigo soundtrack (NEVER retains a previous poem's track).
 *   - If Rodrigo itself is unavailable -> returns the unavailable Rodrigo track
 *     descriptor so the UI reports availability honestly with zero fake playback.
 */
export function resolveTargetSoundtrackForRoute(
  pathname: string,
  catalog: ClientSoundtrackCatalog
): {
  track: ClientSoundtrackTrack;
  isPoemFallbackToArchive: boolean;
  matchedPoemSlug: string | null;
} {
  const poemSlug = extractCorrespondencePoemSlug(pathname);
  if (!poemSlug) {
    return {
      track: catalog.archiveTrack,
      isPoemFallbackToArchive: false,
      matchedPoemSlug: null,
    };
  }

  const assigned = catalog.poemTracks.find(
    (entry) => entry.poemSlug === poemSlug
  );

  if (assigned && assigned.available && assigned.src) {
    return {
      track: assigned,
      isPoemFallbackToArchive: false,
      matchedPoemSlug: poemSlug,
    };
  }

  // Option A fallback: preserve Rodrigo archive soundtrack whenever poem audio is unavailable.
  return {
    track: catalog.archiveTrack,
    isPoemFallbackToArchive: Boolean(assigned),
    matchedPoemSlug: poemSlug,
  };
}

/**
 * Pure playback intent state capturing the distinction between:
 * - Visitor's archive-wide sound preference (`unset` | `sound` | `silence`),
 * - Manual pause via AudioDock (persists across ALL poem & room navigation),
 * - Temporary pause caused exclusively by a Voices & Film recording playing.
 */
export interface SoundtrackIntentState {
  soundPreference: SoundPreference;
  manuallyPaused: boolean;
  pausedForRoomMedia: boolean;
}

export type SoundtrackIntentAction =
  | { type: "enter-with-sound" }
  | { type: "enter-in-silence" }
  | { type: "user-play" }
  | { type: "user-pause" }
  | { type: "room-media-started"; wasMusicActivelyPlaying: boolean }
  | { type: "room-media-ended" }
  | { type: "route-changed"; leftRoomMedia?: boolean };

export function createInitialSoundtrackIntent(): SoundtrackIntentState {
  return {
    soundPreference: "unset",
    manuallyPaused: false,
    pausedForRoomMedia: false,
  };
}

export function reduceSoundtrackIntent(
  state: SoundtrackIntentState,
  action: SoundtrackIntentAction
): SoundtrackIntentState {
  switch (action.type) {
    case "enter-with-sound":
      return {
        soundPreference: "sound",
        manuallyPaused: false,
        pausedForRoomMedia: false,
      };
    case "enter-in-silence":
      return {
        soundPreference: "silence",
        manuallyPaused: false,
        pausedForRoomMedia: false,
      };
    case "user-play":
      return {
        soundPreference: "sound",
        manuallyPaused: false,
        pausedForRoomMedia: false,
      };
    case "user-pause":
      return {
        ...state,
        manuallyPaused: true,
        pausedForRoomMedia: false,
      };
    case "room-media-started":
      // Only mark `pausedForRoomMedia` if music was genuinely playing and
      // neither manually paused nor silenced.
      if (
        action.wasMusicActivelyPlaying &&
        state.soundPreference === "sound" &&
        !state.manuallyPaused
      ) {
        return {
          ...state,
          pausedForRoomMedia: true,
        };
      }
      return state;
    case "room-media-ended":
      return {
        ...state,
        pausedForRoomMedia: false,
      };
    case "route-changed":
      // Manual pause and silence persist across ALL poem and room navigation.
      // Leaving Voices & Film only clears the transient room-media pause flag.
      if (action.leftRoomMedia && state.pausedForRoomMedia) {
        return {
          ...state,
          pausedForRoomMedia: false,
        };
      }
      return state;
  }
}

/**
 * Determines whether route navigation should automatically transition/play
 * the target soundtrack for the new route.
 */
export function shouldAutoTransitionOnRouteChange(
  intent: SoundtrackIntentState
): boolean {
  return (
    intent.soundPreference === "sound" &&
    !intent.manuallyPaused &&
    !intent.pausedForRoomMedia
  );
}

/**
 * Determines whether ending a Voices & Film media recording should gently
 * restore the route soundtrack.
 *
 * Returns `true` ONLY when:
 * - Visitor's preference is still `"sound"`,
 * - No manual pause intervened, AND
 * - Music was actively playing right before room media started.
 */
export function shouldRestoreMusicAfterRoomMediaEnded(
  intent: SoundtrackIntentState
): boolean {
  return (
    intent.soundPreference === "sound" &&
    !intent.manuallyPaused &&
    intent.pausedForRoomMedia
  );
}

/**
 * Validates manifest integrity against the authoritative Correspondence poem
 * registry: every poem mapped exactly once, unique soundtrack IDs, unique
 * asset keys, and zero shared soundtrack records.
 */
export function validateSoundtrackManifestIntegrity(
  archiveTrack: SoundtrackRecord,
  poemTracks: readonly SoundtrackRecord[],
  poems: readonly Pick<CorrespondenceArtefact, "id" | "slug" | "catalogNumber">[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (archiveTrack.scope !== "archive") {
    errors.push("Archive default soundtrack must have scope 'archive'.");
  }

  const seenTrackIds = new Set<string>([archiveTrack.id]);
  const seenAssetKeys = new Set<string>([archiveTrack.assetKey]);
  const seenPoemIds = new Set<string>();
  const seenPoemSlugs = new Set<string>();

  const poemById = new Map(poems.map((p) => [p.id, p]));

  for (const track of poemTracks) {
    if (track.scope !== "poem") {
      errors.push(`Track ${track.id} must have scope 'poem'.`);
    }
    if (seenTrackIds.has(track.id)) {
      errors.push(`Duplicate soundtrack ID: ${track.id}`);
    }
    seenTrackIds.add(track.id);

    if (seenAssetKeys.has(track.assetKey)) {
      errors.push(`Duplicate soundtrack assetKey: ${track.assetKey}`);
    }
    seenAssetKeys.add(track.assetKey);

    if (!track.poemId) {
      errors.push(`Poem track ${track.id} is missing poemId.`);
      continue;
    }

    if (seenPoemIds.has(track.poemId)) {
      errors.push(`Poem ${track.poemId} is mapped more than once.`);
    }
    seenPoemIds.add(track.poemId);

    const poem = poemById.get(track.poemId);
    if (!poem) {
      errors.push(`Track ${track.id} references unknown poemId ${track.poemId}.`);
      continue;
    }

    if (track.poemSlug !== poem.slug) {
      errors.push(
        `Track ${track.id} poemSlug '${track.poemSlug}' does not match poem '${poem.slug}'.`
      );
    }

    if (track.poemSlug && seenPoemSlugs.has(track.poemSlug)) {
      errors.push(`Duplicate poemSlug in soundtrack manifest: ${track.poemSlug}`);
    }
    if (track.poemSlug) {
      seenPoemSlugs.add(track.poemSlug);
    }
  }

  for (const poem of poems) {
    if (!seenPoemIds.has(poem.id)) {
      errors.push(`Poem ${poem.catalogNumber} (${poem.id}) has no assigned soundtrack.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
