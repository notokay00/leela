import type {
  MediaAspectClassKey,
  VoicesAndFilmArtefact,
  VoicesAndFilmClientItem,
  VoicesAndFilmSectionDefinition,
  VoicesAndFilmSectionId,
  VoicesAndFilmSectionView,
} from "./types.ts";

/**
 * The three canonical sections of Movement III — Voices & Film, in exact order
 * and with exact human-facing visible titles (no Roman numerals, no `AU/III`).
 */
export const VOICES_AND_FILM_SECTIONS: readonly VoicesAndFilmSectionDefinition[] =
  [
    {
      id: "my-personal-singer",
      title: "my personal singer",
      treatment: "listening-alcove",
      emptyNotice:
        "This listening space is quiet for now — her voice recordings will wait here once approved.",
    },
    {
      id: "ahhh-i-am-in-love-again",
      title: "Ahhh i am in love again",
      treatment: "playful-reel",
      emptyNotice:
        "Kept open for the little moments that make you smile, once they are ready to be placed here.",
    },
    {
      id: "noice",
      title: "Noice",
      treatment: "standalone-feature",
      emptyNotice: "Held aside for now.",
    },
  ];

/**
 * Authoritative consent and publication check for a Voices & Film artefact.
 * An item is eligible ONLY when both metadata flags are explicitly approved AND
 * its opaque asset key resolves inside `lib/media/registry.ts`.
 */
export function isVoicesAndFilmArtefactApproved(
  artefact: Pick<
    VoicesAndFilmArtefact,
    "publishStatus" | "consentConfirmed" | "assetKey"
  >,
  isAssetApproved: (assetKey: string) => boolean
): boolean {
  return (
    artefact.publishStatus === "ready" &&
    artefact.consentConfirmed === true &&
    Boolean(artefact.assetKey) &&
    isAssetApproved(artefact.assetKey)
  );
}

/**
 * Maps genuine source dimensions or explicit aspect ratio into a static CSS
 * aspect-ratio class bucket so original screen-recording and video proportions
 * are preserved cleanly without inline `style=""` attributes (strict CSP).
 */
export function resolveMediaAspectClassKey(
  width?: number,
  height?: number,
  explicitRatio?: number
): MediaAspectClassKey {
  let ratio: number | null = null;

  if (
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    ratio = width / height;
  } else if (
    typeof explicitRatio === "number" &&
    Number.isFinite(explicitRatio) &&
    explicitRatio > 0
  ) {
    ratio = explicitRatio;
  }

  if (ratio === null) {
    return "natural";
  }
  if (ratio <= 0.65) {
    return "portrait-tall";
  }
  if (ratio < 0.9) {
    return "portrait";
  }
  if (ratio <= 1.12) {
    return "square";
  }
  if (ratio <= 1.5) {
    return "landscape-classic";
  }
  return "landscape-wide";
}

/**
 * Projects a single verified artefact into a sanitized client DTO.
 * Optional poster and audio-derivative references are independently gated
 * through `isAssetApproved` so unapproved derivatives are never exposed.
 */
export function toVoicesAndFilmClientItem(
  artefact: VoicesAndFilmArtefact,
  isAssetApproved: (assetKey: string) => boolean
): VoicesAndFilmClientItem {
  const posterApproved =
    artefact.posterAssetKey && isAssetApproved(artefact.posterAssetKey)
      ? `/api/media/${artefact.posterAssetKey}`
      : undefined;

  const derivativeApproved =
    artefact.audioDerivative &&
    isAssetApproved(artefact.audioDerivative.assetKey)
      ? {
          src: `/api/media/${artefact.audioDerivative.assetKey}`,
          mimeType: artefact.audioDerivative.mimeType,
          ...(artefact.audioDerivative.durationSeconds !== undefined
            ? { durationSeconds: artefact.audioDerivative.durationSeconds }
            : {}),
        }
      : undefined;

  return {
    id: artefact.id,
    section: artefact.section,
    mediaType: artefact.mediaType,
    mimeType: artefact.mimeType,
    src: `/api/media/${artefact.assetKey}`,
    ...(posterApproved ? { posterSrc: posterApproved } : {}),
    ...(artefact.width !== undefined && artefact.width > 0
      ? { width: artefact.width }
      : {}),
    ...(artefact.height !== undefined && artefact.height > 0
      ? { height: artefact.height }
      : {}),
    aspectClassKey: resolveMediaAspectClassKey(
      artefact.width,
      artefact.height,
      artefact.aspectRatio
    ),
    ...(artefact.durationSeconds !== undefined && artefact.durationSeconds > 0
      ? { durationSeconds: artefact.durationSeconds }
      : {}),
    ...(derivativeApproved ? { audioDerivative: derivativeApproved } : {}),
    ...(artefact.title !== undefined && artefact.title.trim().length > 0
      ? { title: artefact.title }
      : {}),
    ...(artefact.description !== undefined &&
    artefact.description.trim().length > 0
      ? { description: artefact.description }
      : {}),
  };
}

/**
 * Filters Voices & Film artefacts strictly through both metadata consent status
 * and the authoritative media registry allowlist, then groups approved items
 * into the three canonical sections in stable `sectionOrder`.
 */
export function buildVoicesAndFilmSections(
  artefacts: readonly VoicesAndFilmArtefact[],
  isAssetApproved: (assetKey: string) => boolean
): VoicesAndFilmSectionView[] {
  const grouped = new Map<
    VoicesAndFilmSectionId,
    Array<{ item: VoicesAndFilmArtefact; index: number }>
  >();

  for (const def of VOICES_AND_FILM_SECTIONS) {
    grouped.set(def.id, []);
  }

  artefacts.forEach((artefact, index) => {
    if (!isVoicesAndFilmArtefactApproved(artefact, isAssetApproved)) {
      return;
    }
    const bucket = grouped.get(artefact.section);
    if (!bucket) {
      return;
    }
    bucket.push({ item: artefact, index });
  });

  return VOICES_AND_FILM_SECTIONS.map((section) => {
    const entries = grouped.get(section.id) ?? [];
    entries.sort((a, b) => {
      if (a.item.sectionOrder !== b.item.sectionOrder) {
        return a.item.sectionOrder - b.item.sectionOrder;
      }
      return a.index - b.index;
    });

    return {
      section,
      items: entries.map(({ item }) =>
        toVoicesAndFilmClientItem(item, isAssetApproved)
      ),
    };
  });
}

/**
 * Pure playback coordination helper: returns the IDs of any currently active
 * media elements that must be paused before starting `targetId`, plus whether
 * the persistent background AudioDock should be paused.
 */
export function resolveExclusivePlaybackTargets(options: {
  targetId: string;
  registeredIds: readonly string[];
  dockStatus: string;
}): {
  pauseRecordingIds: string[];
  shouldPauseDock: boolean;
} {
  const pauseRecordingIds = options.registeredIds.filter(
    (id) => id !== options.targetId
  );
  const shouldPauseDock =
    options.dockStatus === "playing" || options.dockStatus === "waiting";

  return {
    pauseRecordingIds,
    shouldPauseDock,
  };
}
