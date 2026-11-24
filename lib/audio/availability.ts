import "server-only";
import {
  ARCHIVE_DEFAULT_SOUNDTRACK,
  POEM_SOUNDTRACK_MANIFEST,
} from "../../content/soundtracks.ts";
import {
  resolveApprovedMediaAsset,
  type MediaAssetRecord,
} from "../media/registry.ts";
import {
  isSoundtrackRecordPlayable,
  toClientSoundtrackTrack,
} from "./soundtrack.ts";
import type {
  ClientSoundtrackCatalog,
  ClientSoundtrackTrack,
  SoundtrackRecord,
} from "./soundtrack-types.ts";

/**
 * Opaque asset ID reserved for the authorized archive-wide score recording
 * (Joaquín Rodrigo — Concierto de Aranjuez, II. Adagio, Grimethorpe performance).
 *
 * Licensing note:
 * Musical hosting/licensing authorization is tracked strictly separately from
 * personal-media consent. No recording is bundled or enabled until hosting
 * rights are explicitly confirmed (`rightsApproval` + `hostingApproved: true`
 * on the soundtrack manifest AND `assetCategory: "music-soundtrack"`,
 * `hostingRightsConfirmed: true`, `publishStatus: "ready"` in the private media
 * allowlist).
 */
export const ARCHIVE_SCORE_ASSET_ID = ARCHIVE_DEFAULT_SOUNDTRACK.assetKey;

export interface SoundtrackResolutionOptions {
  records?: readonly MediaAssetRecord[];
  env?: Record<string, string | undefined>;
}

function resolveSingleSoundtrack(
  record: SoundtrackRecord,
  options?: SoundtrackResolutionOptions
): ClientSoundtrackTrack {
  const env = options?.env ?? process.env;
  const asset = resolveApprovedMediaAsset(record.assetKey, options);

  if (
    !asset ||
    asset.assetCategory !== "music-soundtrack" ||
    asset.hostingRightsConfirmed !== true
  ) {
    return toClientSoundtrackTrack(record, { available: false });
  }

  const allowSyntheticOverride =
    env.ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES === "1" &&
    asset.isSyntheticTestFixture === true;

  const playable = isSoundtrackRecordPlayable(record, () => true, {
    allowSyntheticOverride,
  });

  if (!playable) {
    return toClientSoundtrackTrack(record, { available: false });
  }

  return toClientSoundtrackTrack(record, {
    available: true,
    mimeType: asset.mimeType,
  });
}

/**
 * Resolves only the archive-wide Rodrigo soundtrack metadata & live availability.
 * Safe to pass on the unauthenticated Threshold route (`/`): exposes zero poem
 * metadata, slugs, or storage paths.
 */
export function resolveServerArchiveSoundtrack(
  options?: SoundtrackResolutionOptions
): ClientSoundtrackTrack {
  return resolveSingleSoundtrack(ARCHIVE_DEFAULT_SOUNDTRACK, options);
}

/**
 * Resolves the full sanitized soundtrack catalog (archive-wide Rodrigo +
 * all 23 poem-specific assignments) strictly against musical hosting rights
 * and the private media allowlist.
 *
 * Must only be passed to client components inside authenticated archive layouts.
 */
export function resolveServerSoundtrackCatalog(
  options?: SoundtrackResolutionOptions
): ClientSoundtrackCatalog {
  return {
    archiveTrack: resolveSingleSoundtrack(ARCHIVE_DEFAULT_SOUNDTRACK, options),
    poemTracks: POEM_SOUNDTRACK_MANIFEST.map((record) =>
      resolveSingleSoundtrack(record, options)
    ),
  };
}

export function isAuthorizedAudioConfigured(
  options?: SoundtrackResolutionOptions
): boolean {
  return resolveServerArchiveSoundtrack(options).available;
}
