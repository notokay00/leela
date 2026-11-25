import "server-only";
import { readFileSync } from "node:fs";
import type { PublishStatus } from "@/content/types";

export type MediaSensitivity = "high" | "standard";

export type MediaAssetCategory = "personal-media" | "music-soundtrack";

export interface MediaAssetRecord {
  /** Opaque public/API identifier (no paths, slashes, dots, or extensions). */
  id: string;
  /** Internal relative path inside storage root (never exposed to clients). */
  storageRelativePath: string;
  mimeType: string;
  downloadFilename: string;
  sensitivity: MediaSensitivity;
  publishStatus: PublishStatus;
  /** Personal-media consent confirmation (never a substitute for music hosting rights). */
  consentConfirmed: boolean;
  /** Defaults to `"personal-media"` when omitted. */
  assetCategory?: MediaAssetCategory;
  /** Musical licensing/hosting authorization (required when assetCategory === "music-soundtrack"). */
  hostingRightsConfirmed?: boolean;
  /** True only for isolated synthetic test fixtures loaded outside the production registry. */
  isSyntheticTestFixture?: boolean;
}

const OPAQUE_ASSET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

const ALLOWED_MIME_TYPES = new Set<string>([
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "image/avif",
  "image/webp",
  "image/jpeg",
  "image/png",
  "text/vtt",
]);

function createStillnessPhotoRecord(index: number): MediaAssetRecord {
  const padded = String(index).padStart(2, "0");
  return {
    id: `arc-i-${padded}`,
    storageRelativePath: `stillness/stillness-${padded}.webp`,
    mimeType: "image/webp",
    downloadFilename: `arc-i-${padded}.webp`,
    sensitivity: "high",
    publishStatus: "withheld",
    // Personal-media consent is strictly separate from musical hosting rights and
    // must remain false until explicit consent from every identifiable person
    // depicted has been individually established.
    consentConfirmed: false,
    assetCategory: "personal-media",
  };
}

function createApprovedSoundtrackRecord(
  id: string,
  filename: string,
  mimeType: "audio/mpeg" | "audio/mp4"
): MediaAssetRecord {
  return {
    id,
    storageRelativePath: `soundtracks/${filename}`,
    mimeType,
    downloadFilename: filename,
    sensitivity: "high",
    publishStatus: "ready",
    // Musical hosting rights are strictly separate from personal-media consent.
    consentConfirmed: false,
    assetCategory: "music-soundtrack",
    hostingRightsConfirmed: true,
  };
}

/**
 * Authoritative server-only registry mapping opaque asset identifiers to
 * physical storage locations.
 *
 * - ALL personal archive material (Stillness photographs and Voices & Film)
 *   defaults strictly to `publishStatus: "withheld"` and `consentConfirmed: false`
 *   until explicit consent from every identifiable person depicted is established.
 * - Approved music soundtracks use `assetCategory: "music-soundtrack"` and
 *   `hostingRightsConfirmed: true` while keeping personal `consentConfirmed: false`.
 */
const ARCHIVE_MEDIA_REGISTRY: readonly MediaAssetRecord[] = [
  {
    id: "arc-iii-01-film",
    storageRelativePath: "video/leela_poem.mp4",
    mimeType: "video/mp4",
    downloadFilename: "arc-iii-01.mp4",
    sensitivity: "high",
    publishStatus: "withheld",
    consentConfirmed: false,
    assetCategory: "personal-media",
  },
  ...Array.from({ length: 15 }, (_, idx) =>
    createStillnessPhotoRecord(idx + 1)
  ),
  createApprovedSoundtrackRecord(
    "arc-score-aranjuez",
    "arc-score-aranjuez.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-001",
    "arc-snd-poem-001.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-002",
    "arc-snd-poem-002.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-003",
    "arc-snd-poem-003.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-004",
    "arc-snd-poem-004.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-005",
    "arc-snd-poem-005.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-006",
    "arc-snd-poem-006.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-007",
    "arc-snd-poem-007.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-008",
    "arc-snd-poem-008.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-009",
    "arc-snd-poem-009.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-010",
    "arc-snd-poem-010.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-011",
    "arc-snd-poem-011.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-012",
    "arc-snd-poem-012.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-013",
    "arc-snd-poem-013.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-014",
    "arc-snd-poem-014.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-015",
    "arc-snd-poem-015.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-016",
    "arc-snd-poem-016.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-017",
    "arc-snd-poem-017.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-018",
    "arc-snd-poem-018.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-019",
    "arc-snd-poem-019.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-020",
    "arc-snd-poem-020.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-021",
    "arc-snd-poem-021.mp3",
    "audio/mpeg"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-022",
    "arc-snd-poem-022.m4a",
    "audio/mp4"
  ),
  createApprovedSoundtrackRecord(
    "arc-snd-poem-023",
    "arc-snd-poem-023.mp3",
    "audio/mpeg"
  ),
];

export function isValidOpaqueAssetId(raw: string): boolean {
  return typeof raw === "string" && OPAQUE_ASSET_ID_PATTERN.test(raw);
}

export function isApprovedMediaRecord(record: MediaAssetRecord): boolean {
  if (
    !isValidOpaqueAssetId(record.id) ||
    !ALLOWED_MIME_TYPES.has(record.mimeType) ||
    record.publishStatus !== "ready"
  ) {
    return false;
  }

  if (record.assetCategory === "music-soundtrack") {
    // Musical licensing/hosting authorization is strictly separate from personal consent.
    return record.hostingRightsConfirmed === true;
  }

  return record.consentConfirmed === true;
}

function loadSyntheticTestRecords(
  env: Record<string, string | undefined>
): MediaAssetRecord[] {
  if (
    env.ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES !== "1" ||
    !env.ARCHIVE_SYNTHETIC_MEDIA_MANIFEST
  ) {
    return [];
  }

  try {
    const raw = readFileSync(env.ARCHIVE_SYNTHETIC_MEDIA_MANIFEST, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const records: MediaAssetRecord[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.storageRelativePath === "string" &&
        typeof item.mimeType === "string" &&
        typeof item.downloadFilename === "string" &&
        (item.sensitivity === "high" || item.sensitivity === "standard") &&
        (item.publishStatus === "ready" ||
          item.publishStatus === "draft" ||
          item.publishStatus === "withheld") &&
        typeof item.consentConfirmed === "boolean"
      ) {
        const assetCategory: MediaAssetCategory | undefined =
          item.assetCategory === "music-soundtrack" ||
          item.assetCategory === "personal-media"
            ? item.assetCategory
            : undefined;
        const hostingRightsConfirmed: boolean | undefined =
          typeof item.hostingRightsConfirmed === "boolean"
            ? item.hostingRightsConfirmed
            : undefined;

        records.push({
          ...(item as MediaAssetRecord),
          ...(assetCategory ? { assetCategory } : {}),
          ...(hostingRightsConfirmed !== undefined
            ? { hostingRightsConfirmed }
            : {}),
          isSyntheticTestFixture: true,
        });
      }
    }
    return records;
  } catch {
    return [];
  }
}

export function buildMediaAllowlist(
  records: readonly MediaAssetRecord[]
): ReadonlyMap<string, MediaAssetRecord> {
  const allowlist = new Map<string, MediaAssetRecord>();
  for (const record of records) {
    if (isApprovedMediaRecord(record)) {
      allowlist.set(record.id, record);
    }
  }
  return allowlist;
}

/**
 * Resolves an opaque asset ID strictly against explicitly approved
 * (`publishStatus === "ready" && consentConfirmed === true`) assets.
 *
 * Unknown, malformed, draft, unconsented, and withheld assets all resolve to
 * `null` uniformly so callers never leak filesystem or consent existence.
 */
export function resolveApprovedMediaAsset(
  rawAssetId: string,
  options?: {
    records?: readonly MediaAssetRecord[];
    env?: Record<string, string | undefined>;
  }
): MediaAssetRecord | null {
  if (!isValidOpaqueAssetId(rawAssetId)) {
    return null;
  }

  const env = options?.env ?? process.env;
  const allRecords = options?.records ?? [
    ...ARCHIVE_MEDIA_REGISTRY,
    ...loadSyntheticTestRecords(env),
  ];

  const allowlist = buildMediaAllowlist(allRecords);
  return allowlist.get(rawAssetId) ?? null;
}

export function getRegisteredArchiveMediaRecords(): readonly MediaAssetRecord[] {
  return ARCHIVE_MEDIA_REGISTRY;
}
