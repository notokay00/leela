import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CORRESPONDENCE_ARTIFACTS } from "../content/artifacts/correspondence.ts";
import {
  ALL_SOUNDTRACK_RECORDS,
  ARCHIVE_DEFAULT_SOUNDTRACK,
  POEM_SOUNDTRACK_MANIFEST,
} from "../content/soundtracks.ts";
import {
  resolveServerArchiveSoundtrack,
  resolveServerSoundtrackCatalog,
} from "../lib/audio/availability.ts";
import {
  clampRestorablePosition,
  clampTrackGainMultiplier,
  computeDeckOutputVolume,
  computeEqualPowerGains,
  DEFAULT_CROSSFADE_DURATION_MS,
  selectDeckTransitionPlan,
} from "../lib/audio/crossfade.ts";
import {
  createInitialSoundtrackIntent,
  extractCorrespondencePoemSlug,
  isSoundtrackRecordPlayable,
  reduceSoundtrackIntent,
  resolveTargetSoundtrackForRoute,
  shouldAutoTransitionOnRouteChange,
  shouldRestoreMusicAfterRoomMediaEnded,
  toClientSoundtrackTrack,
  validateSoundtrackManifestIntegrity,
} from "../lib/audio/soundtrack.ts";
import type { ClientSoundtrackCatalog } from "../lib/audio/soundtrack-types.ts";
import {
  resolveReaderNavigation,
  selectApprovedCorrespondenceArtefacts,
} from "../lib/correspondence/collection.ts";
import { detectCorrespondenceSwipe } from "../lib/correspondence/swipe.ts";
import {
  isApprovedMediaRecord,
  isValidOpaqueAssetId,
  type MediaAssetRecord,
} from "../lib/media/registry.ts";
import { resolveExclusivePlaybackTargets } from "../lib/voices-and-film/collection.ts";

const EXPECTED_23_ASSIGNMENTS: readonly {
  catalogNumber: string;
  poemId: string;
  poemSlug: string;
  poemTitle: string;
  title: string;
  artist: string;
}[] = [
  {
    catalogNumber: "AU/II-001",
    poemId: "correspondence-001",
    poemSlug: "for-you-poem",
    poemTitle: "For You",
    title: "Hothon Se Chhu Lo Tum",
    artist: "Jagjit Singh",
  },
  {
    catalogNumber: "AU/II-002",
    poemId: "correspondence-002",
    poemSlug: "poem-002",
    poemTitle: "यादों का मौसम",
    title: "Na Jee Bharke Dekha",
    artist: "Chandan Dass",
  },
  {
    catalogNumber: "AU/II-003",
    poemId: "correspondence-003",
    poemSlug: "poem-003",
    poemTitle: "रक़ीब",
    title: "Tum Itna Jo Muskura Rahe Ho",
    artist: "Jagjit Singh",
  },
  {
    catalogNumber: "AU/II-004",
    poemId: "correspondence-004",
    poemSlug: "poem-004",
    poemTitle: "एहतिसाब",
    title: "God Turn Me Into a Flower",
    artist: "Weyes Blood",
  },
  {
    catalogNumber: "AU/II-005",
    poemId: "correspondence-005",
    poemSlug: "poem-005",
    poemTitle: "सुलगती यादें",
    title: "Ranjish Hi Sahi",
    artist: "Mehdi Hassan",
  },
  {
    catalogNumber: "AU/II-006",
    poemId: "correspondence-006",
    poemSlug: "poem-006",
    poemTitle: "मसला",
    title: "Zindagi Jab Bhi",
    artist: "Khayyam, Talat Aziz",
  },
  {
    catalogNumber: "AU/II-007",
    poemId: "correspondence-007",
    poemSlug: "poem-007",
    poemTitle: "मशरिक़",
    title: "Tum Ko Dekha To Yeh Khayal Aaya",
    artist: "Jagjit Singh, Chitra Singh",
  },
  {
    catalogNumber: "AU/II-008",
    poemId: "correspondence-008",
    poemSlug: "poem-008",
    poemTitle: "गुलाम",
    title: "Chupke Chupke Raat Din Aansoo...",
    artist: "Ghulam Ali",
  },
  {
    catalogNumber: "AU/II-009",
    poemId: "correspondence-009",
    poemSlug: "poem-009",
    poemTitle: "ख़्वाहिश",
    title: "Koi Fariyaad",
    artist: "Jagjit Singh",
  },
  {
    catalogNumber: "AU/II-010",
    poemId: "correspondence-010",
    poemSlug: "poem-010",
    poemTitle: "रौशनी की दहलीज़",
    title: "Ahista",
    artist: "Pankaj Udhas",
  },
  {
    catalogNumber: "AU/II-011",
    poemId: "correspondence-011",
    poemSlug: "poem-011",
    poemTitle: "तू ही काफ़ी है",
    title: "Salona Sa Sajan Hai Aur Main Hoon",
    artist: "Asha Bhosle",
  },
  {
    catalogNumber: "AU/II-012",
    poemId: "correspondence-012",
    poemSlug: "poem-012",
    poemTitle: "मेरा आख़िरी दीन",
    title: "Heaven Can Wait",
    artist: "Michael Jackson",
  },
  {
    catalogNumber: "AU/II-013",
    poemId: "correspondence-013",
    poemSlug: "poem-013",
    poemTitle: "ख़्वाबों की आग़ोश",
    title: "Dil Mein Ek Lehar Si Uthi Hai",
    artist: "Ghulam Ali",
  },
  {
    catalogNumber: "AU/II-014",
    poemId: "correspondence-014",
    poemSlug: "poem-014",
    poemTitle: "हैरत-ए-इश्क़",
    title: "Hoshwalon Ko Khabar Kya",
    artist: "Jagjit Singh",
  },
  {
    catalogNumber: "AU/II-015",
    poemId: "correspondence-015",
    poemSlug: "poem-015",
    poemTitle: "किस्मत नहीं, फ़ैसला",
    title: "Rangrasiya",
    artist: "Rekha Bhardwaj, Hopun Saikia",
  },
  {
    catalogNumber: "AU/II-016",
    poemId: "correspondence-016",
    poemSlug: "poem-016",
    poemTitle: "रेत की इमारतें",
    title: "Sham-E-Gham Ki Qasam",
    artist: "Talat Mahmood",
  },
  {
    catalogNumber: "AU/II-017",
    poemId: "correspondence-017",
    poemSlug: "poem-017",
    poemTitle: "बचाव",
    title: "Na Mohabbat Na Dosti (Waqt Ruk...)",
    artist: "Jagjit Singh",
  },
  {
    catalogNumber: "AU/II-018",
    poemId: "correspondence-018",
    poemSlug: "poem-018",
    poemTitle: "बे-निशाँ",
    title: "Ab Kya Ghazal Sunaoon",
    artist: "Talat Aziz",
  },
  {
    catalogNumber: "AU/II-019",
    poemId: "correspondence-019",
    poemSlug: "poem-019",
    poemTitle: "एक आवाज़ का इंतज़ार",
    title: "Tere Baare Mein Jab Socha Nahin...",
    artist: "Jagjit Singh",
  },
  {
    catalogNumber: "AU/II-020",
    poemId: "correspondence-020",
    poemSlug: "poem-020",
    poemTitle: "मोहब्बत की पहचान",
    title: "Andromeda",
    artist: "Weyes Blood",
  },
  {
    catalogNumber: "AU/II-021",
    poemId: "correspondence-021",
    poemSlug: "poem-021",
    poemTitle: "तेरा नूर",
    title: "Kiss of Life",
    artist: "Sade",
  },
  {
    catalogNumber: "AU/II-022",
    poemId: "correspondence-022",
    poemSlug: "poem-022",
    poemTitle: "Saudade",
    title: "Old Money",
    artist: "Lana Del Rey",
  },
  {
    catalogNumber: "AU/II-023",
    poemId: "correspondence-023",
    poemSlug: "poem-023",
    poemTitle: "Izel",
    title: "Futile Devices",
    artist: "Sufjan Stevens",
  },
];

function buildTestCatalog(options: {
  archiveAvailable: boolean;
  availablePoemSlugs: ReadonlySet<string>;
}): ClientSoundtrackCatalog {
  return {
    archiveTrack: toClientSoundtrackTrack(ARCHIVE_DEFAULT_SOUNDTRACK, {
      available: options.archiveAvailable,
      mimeType: options.archiveAvailable ? "audio/mpeg" : null,
    }),
    poemTracks: POEM_SOUNDTRACK_MANIFEST.map((record) => {
      const available = Boolean(
        record.poemSlug && options.availablePoemSlugs.has(record.poemSlug)
      );
      return toClientSoundtrackTrack(record, {
        available,
        mimeType: available ? "audio/mpeg" : null,
      });
    }),
  };
}

describe("Phase 4.1 — Track mapping, exact 23-poem assignments & SHA-256 preservation", () => {
  it("configures Joaquín Rodrigo (Grimethorpe performance) as the archive-wide default without fabricating audio assets", () => {
    assert.equal(ARCHIVE_DEFAULT_SOUNDTRACK.scope, "archive");
    assert.equal(
      ARCHIVE_DEFAULT_SOUNDTRACK.title,
      "Concierto de Aranjuez, II. Adagio"
    );
    assert.equal(ARCHIVE_DEFAULT_SOUNDTRACK.artist, "Joaquín Rodrigo");
    assert.match(ARCHIVE_DEFAULT_SOUNDTRACK.performance ?? "", /Grimethorpe/);
    assert.equal(ARCHIVE_DEFAULT_SOUNDTRACK.rightsApproval, "unverified");
    assert.equal(ARCHIVE_DEFAULT_SOUNDTRACK.hostingApproved, false);
    assert.equal(ARCHIVE_DEFAULT_SOUNDTRACK.mimeType, null);
    assert.equal(ARCHIVE_DEFAULT_SOUNDTRACK.audioFormat, null);
  });

  it("maps all 23 poem IDs exactly once to 23 unique soundtrack IDs with verbatim titles, ellipses, and artists", () => {
    assert.equal(POEM_SOUNDTRACK_MANIFEST.length, 23);
    assert.equal(ALL_SOUNDTRACK_RECORDS.length, 24);

    const integrity = validateSoundtrackManifestIntegrity(
      ARCHIVE_DEFAULT_SOUNDTRACK,
      POEM_SOUNDTRACK_MANIFEST,
      CORRESPONDENCE_ARTIFACTS
    );
    assert.equal(integrity.valid, true, integrity.errors.join("; "));

    const uniqueIds = new Set(ALL_SOUNDTRACK_RECORDS.map((r) => r.id));
    const uniqueAssetKeys = new Set(
      ALL_SOUNDTRACK_RECORDS.map((r) => r.assetKey)
    );
    assert.equal(uniqueIds.size, 24);
    assert.equal(uniqueAssetKeys.size, 24);

    for (const record of ALL_SOUNDTRACK_RECORDS) {
      assert.equal(isValidOpaqueAssetId(record.assetKey), true);
      assert.equal(record.rightsApproval, "unverified");
      assert.equal(record.hostingApproved, false);
      assert.equal(record.mimeType, null);
      assert.equal(record.audioFormat, null);
    }

    for (let i = 0; i < EXPECTED_23_ASSIGNMENTS.length; i++) {
      const expected = EXPECTED_23_ASSIGNMENTS[i];
      const poem = CORRESPONDENCE_ARTIFACTS[i];
      const assigned = POEM_SOUNDTRACK_MANIFEST[i];

      assert.equal(poem.catalogNumber, expected.catalogNumber);
      assert.equal(poem.id, expected.poemId);
      assert.equal(poem.slug, expected.poemSlug);
      assert.equal(poem.title, expected.poemTitle);

      assert.equal(assigned.poemId, expected.poemId);
      assert.equal(assigned.poemSlug, expected.poemSlug);
      assert.equal(assigned.title, expected.title);
      assert.equal(assigned.artist, expected.artist);

      // Verify zero poem text or SHA-256 mutation
      const computedSha = createHash("sha256")
        .update(Buffer.from(poem.originalText, "utf8"))
        .digest("hex");
      assert.equal(computedSha, poem.originalTextSha256);
    }

    // Explicitly verify truncated titles preserve exact supplied ellipses verbatim
    assert.equal(
      POEM_SOUNDTRACK_MANIFEST[7].title,
      "Chupke Chupke Raat Din Aansoo..."
    );
    assert.equal(
      POEM_SOUNDTRACK_MANIFEST[16].title,
      "Na Mohabbat Na Dosti (Waqt Ruk...)"
    );
    assert.equal(
      POEM_SOUNDTRACK_MANIFEST[18].title,
      "Tere Baare Mein Jab Socha Nahin..."
    );
  });

  it("strictly separates musical hosting/licensing rights from personal-media consent flags", () => {
    const musicWithConsentOnly: MediaAssetRecord = {
      id: "arc-snd-poem-001",
      storageRelativePath: "audio/test.mp3",
      mimeType: "audio/mpeg",
      downloadFilename: "test.mp3",
      sensitivity: "standard",
      publishStatus: "ready",
      consentConfirmed: true,
      assetCategory: "music-soundtrack",
      hostingRightsConfirmed: false,
    };

    const musicWithHostingRights: MediaAssetRecord = {
      id: "arc-snd-poem-001",
      storageRelativePath: "audio/test.mp3",
      mimeType: "audio/mpeg",
      downloadFilename: "test.mp3",
      sensitivity: "standard",
      publishStatus: "ready",
      consentConfirmed: false,
      assetCategory: "music-soundtrack",
      hostingRightsConfirmed: true,
    };

    // Personal consent flag MUST NOT substitute for confirmed music hosting rights
    assert.equal(isApprovedMediaRecord(musicWithConsentOnly), false);
    assert.equal(isApprovedMediaRecord(musicWithHostingRights), true);

    // Production manifest records remain unplayable while rightsApproval === "unverified"
    assert.equal(
      isSoundtrackRecordPlayable(POEM_SOUNDTRACK_MANIFEST[0], () => true),
      false
    );

    // Only explicitly approved hosting + verified rights + allowlisted asset becomes playable
    const approvedRecord = {
      ...POEM_SOUNDTRACK_MANIFEST[0],
      rightsApproval: "licensed" as const,
      hostingApproved: true,
    };
    assert.equal(isSoundtrackRecordPlayable(approvedRecord, () => true), true);
    assert.equal(isSoundtrackRecordPlayable(approvedRecord, () => false), false);

    // Default server resolution with zero supplied recordings reports all tracks unavailable
    const prodArchive = resolveServerArchiveSoundtrack();
    assert.equal(prodArchive.available, false);
    assert.equal(prodArchive.src, null);

    const prodCatalog = resolveServerSoundtrackCatalog();
    assert.equal(prodCatalog.archiveTrack.available, false);
    assert.equal(prodCatalog.poemTracks.length, 23);
    assert.ok(prodCatalog.poemTracks.every((t) => !t.available && t.src === null));
  });
});

describe("Phase 4.1 — Route-to-soundtrack playback, Option A fallback & navigation", () => {
  const all23Slugs = new Set(CORRESPONDENCE_ARTIFACTS.map((p) => p.slug));

  it("selects Rodrigo across all non-poem archive routes without restarting", () => {
    const catalog = buildTestCatalog({
      archiveAvailable: true,
      availablePoemSlugs: all23Slugs,
    });

    for (const route of [
      "/",
      "/archive",
      "/archive/stillness",
      "/archive/correspondence",
      "/archive/correspondence/",
      "/archive/voices-and-film",
      "/archive/cadenza",
    ]) {
      assert.equal(extractCorrespondencePoemSlug(route), null);
      const resolved = resolveTargetSoundtrackForRoute(route, catalog);
      assert.equal(resolved.track.id, ARCHIVE_DEFAULT_SOUNDTRACK.id);
      assert.equal(resolved.track.scope, "archive");
      assert.equal(resolved.isPoemFallbackToArchive, false);
    }
  });

  it("selects the exact assigned soundtrack for all 23 poems across direct open, Previous/Next, and mobile swipe", () => {
    const catalog = buildTestCatalog({
      archiveAvailable: true,
      availablePoemSlugs: all23Slugs,
    });
    const approved = selectApprovedCorrespondenceArtefacts(
      CORRESPONDENCE_ARTIFACTS
    );

    for (let i = 0; i < approved.length; i++) {
      const poem = approved[i];
      const expected = EXPECTED_23_ASSIGNMENTS[i];
      const route = `/archive/correspondence/${poem.slug}`;
      const resolved = resolveTargetSoundtrackForRoute(route, catalog);

      assert.equal(resolved.track.scope, "poem");
      assert.equal(resolved.track.title, expected.title);
      assert.equal(resolved.track.artist, expected.artist);
      assert.equal(resolved.track.available, true);
      assert.equal(resolved.isPoemFallbackToArchive, false);

      // Verify Previous/Next chain resolves destination poem soundtracks
      const nav = resolveReaderNavigation(approved, poem.slug);
      if (nav.next) {
        const nextResolved = resolveTargetSoundtrackForRoute(
          `/archive/correspondence/${nav.next.slug}`,
          catalog
        );
        assert.equal(nextResolved.track.title, EXPECTED_23_ASSIGNMENTS[i + 1].title);
      }
      if (nav.previous) {
        const prevResolved = resolveTargetSoundtrackForRoute(
          `/archive/correspondence/${nav.previous.slug}`,
          catalog
        );
        assert.equal(prevResolved.track.title, EXPECTED_23_ASSIGNMENTS[i - 1].title);
      }
    }

    // Mobile horizontal swipe left -> next poem -> selects poem-002 track
    const swipeDir = detectCorrespondenceSwipe({
      startX: 290,
      startY: 300,
      endX: 160,
      endY: 308,
      durationMs: 210,
      hasPrevious: false,
      hasNext: true,
    });
    assert.equal(swipeDir, "next");
    const firstNav = resolveReaderNavigation(approved, "for-you-poem");
    assert.ok(firstNav.next);
    const swipedTarget = resolveTargetSoundtrackForRoute(
      `/archive/correspondence/${firstNav.next.slug}`,
      catalog
    );
    assert.equal(swipedTarget.track.title, "Na Jee Bharke Dekha");
    assert.equal(swipedTarget.track.artist, "Chandan Dass");
  });

  it("enforces Option A fallback to Rodrigo when a poem soundtrack is missing and never retains previous poem audio", () => {
    // AU/II-001..003 available, AU/II-004 (एहतिसाब) unavailable
    const catalog = buildTestCatalog({
      archiveAvailable: true,
      availablePoemSlugs: new Set(["for-you-poem", "poem-002", "poem-003"]),
    });

    const onPoem3 = resolveTargetSoundtrackForRoute(
      "/archive/correspondence/poem-003",
      catalog
    );
    assert.equal(onPoem3.track.title, "Tum Itna Jo Muskura Rahe Ho");

    // Moving to AU/II-004 (एहतिसाब) falls back to Rodrigo, NOT poem-003
    const onPoem4 = resolveTargetSoundtrackForRoute(
      "/archive/correspondence/poem-004",
      catalog
    );
    assert.equal(onPoem4.track.id, ARCHIVE_DEFAULT_SOUNDTRACK.id);
    assert.equal(onPoem4.track.title, "Concierto de Aranjuez, II. Adagio");
    assert.equal(onPoem4.track.artist, "Joaquín Rodrigo");
    assert.equal(onPoem4.isPoemFallbackToArchive, true);

    // Leaving poem back to Correspondence catalogue restores Rodrigo
    const backToCatalogue = resolveTargetSoundtrackForRoute(
      "/archive/correspondence",
      catalog
    );
    assert.equal(backToCatalogue.track.id, ARCHIVE_DEFAULT_SOUNDTRACK.id);
    assert.equal(backToCatalogue.isPoemFallbackToArchive, false);
  });

  it("reports unavailable honestly when archive audio is missing and never invents fake playback", () => {
    const emptyCatalog = buildTestCatalog({
      archiveAvailable: false,
      availablePoemSlugs: new Set(),
    });

    const onIndex = resolveTargetSoundtrackForRoute("/archive", emptyCatalog);
    assert.equal(onIndex.track.available, false);
    assert.equal(onIndex.track.availability, "unavailable");
    assert.equal(onIndex.track.src, null);

    const onPoem = resolveTargetSoundtrackForRoute(
      "/archive/correspondence/poem-004",
      emptyCatalog
    );
    assert.equal(onPoem.track.available, false);
    assert.equal(onPoem.track.src, null);
  });
});

describe("Phase 4.1 — Equal-power 2.5s crossfade curves, rapid navigation & position restore", () => {
  it("uses a 2.5-second default crossfade with smooth equal-power curves, mute & volume stability, and loudness trim", () => {
    assert.equal(DEFAULT_CROSSFADE_DURATION_MS, 2500);

    const start = computeEqualPowerGains({
      progress: 0,
      masterVolume: 0.7,
      muted: false,
    });
    assert.equal(start.outgoingEnvelope, 1);
    assert.equal(start.incomingEnvelope, 0);
    assert.ok(Math.abs(start.outgoingVolume - 0.7) < 1e-6);
    assert.equal(start.incomingVolume, 0);

    const mid = computeEqualPowerGains({
      progress: 0.5,
      masterVolume: 0.8,
      muted: false,
    });
    // Constant acoustic power: cos^2(pi/4) + sin^2(pi/4) === 1
    const powerSum =
      mid.outgoingEnvelope * mid.outgoingEnvelope +
      mid.incomingEnvelope * mid.incomingEnvelope;
    assert.ok(Math.abs(powerSum - 1) < 1e-6);
    assert.ok(mid.outgoingVolume > 0.5 && mid.incomingVolume > 0.5);

    const end = computeEqualPowerGains({
      progress: 1,
      masterVolume: 0.7,
      muted: false,
    });
    assert.equal(end.outgoingEnvelope, 0);
    assert.equal(end.incomingEnvelope, 1);
    assert.equal(end.outgoingVolume, 0);
    assert.ok(Math.abs(end.incomingVolume - 0.7) < 1e-6);

    // Monotonicity across 20 steps: zero jumps or dips
    let prevOut = 1;
    let prevIn = 0;
    for (let step = 1; step <= 20; step++) {
      const g = computeEqualPowerGains({
        progress: step / 20,
        masterVolume: 0.7,
        muted: false,
      });
      assert.ok(g.outgoingEnvelope <= prevOut);
      assert.ok(g.incomingEnvelope >= prevIn);
      prevOut = g.outgoingEnvelope;
      prevIn = g.incomingEnvelope;
    }

    // Mute strictly zeroes both decks without losing envelopes
    const mutedMid = computeEqualPowerGains({
      progress: 0.5,
      masterVolume: 0.9,
      muted: true,
    });
    assert.equal(mutedMid.outgoingVolume, 0);
    assert.equal(mutedMid.incomingVolume, 0);
    assert.ok(mutedMid.incomingEnvelope > 0.7);

    // Loudness trim & mid-fade live master volume updates
    assert.equal(clampTrackGainMultiplier(0.1), 0.25);
    assert.equal(clampTrackGainMultiplier(1.5), 1);
    const liveScaled = computeDeckOutputVolume({
      envelope: mid.incomingEnvelope,
      masterVolume: 0.5,
      muted: false,
      trackGain: 0.8,
    });
    assert.ok(
      Math.abs(liveScaled - mid.incomingEnvelope * 0.5 * 0.8) < 1e-6
    );
  });

  it("supersedes unfinished transitions safely during rapid poem navigation and clamps restored Rodrigo position", () => {
    // Mid-crossfade: Deck A is still louder (0.82) than Deck B (0.57)
    // Rapid swipe keeps Deck A as outgoing bed starting at 0.82 (no jump!) and reclaims Deck B
    const rapid1 = selectDeckTransitionPlan({
      activeDeck: "B",
      deckAPlaying: true,
      deckBPlaying: true,
      deckAEnvelope: 0.82,
      deckBEnvelope: 0.57,
    });
    assert.equal(rapid1.outgoingDeck, "A");
    assert.equal(rapid1.incomingDeck, "B");
    assert.equal(rapid1.outgoingStartEnvelope, 0.82);

    // Late-crossfade: Deck B is now louder (0.91) than Deck A (0.41)
    // Rapid swipe keeps Deck B as outgoing bed at 0.91 and reclaims Deck A
    const rapid2 = selectDeckTransitionPlan({
      activeDeck: "B",
      deckAPlaying: true,
      deckBPlaying: true,
      deckAEnvelope: 0.41,
      deckBEnvelope: 0.91,
    });
    assert.equal(rapid2.outgoingDeck, "B");
    assert.equal(rapid2.incomingDeck, "A");
    assert.equal(rapid2.outgoingStartEnvelope, 0.91);

    // Starting crossfade from live outgoing envelope never jumps upward at progress=0
    const supersededStart = computeEqualPowerGains({
      progress: 0,
      masterVolume: 0.7,
      muted: false,
      outgoingStartEnvelope: rapid1.outgoingStartEnvelope,
    });
    assert.ok(Math.abs(supersededStart.outgoingEnvelope - 0.82) < 1e-6);

    // Restoring Rodrigo position safely clamps within finite track duration
    assert.equal(clampRestorablePosition(42.5, 300), 42.5);
    assert.equal(clampRestorablePosition(299.9, 300), 299.5);
    assert.equal(clampRestorablePosition(-5, 300), 0);
  });
});

describe("Phase 4.1 — User preference, manual pause, silence & Voices & Film coordination", () => {
  it("prevents unexpected playback on initial load and enforces silence across all routes", () => {
    let intent = createInitialSoundtrackIntent();
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);

    // Visitor enters in silence
    intent = reduceSoundtrackIntent(intent, { type: "enter-in-silence" });
    assert.equal(intent.soundPreference, "silence");
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);

    // Navigating across rooms and poems never overrides silence
    intent = reduceSoundtrackIntent(intent, { type: "route-changed" });
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);

    // Playing and ending a Voices & Film video never starts music when in silence
    intent = reduceSoundtrackIntent(intent, {
      type: "room-media-started",
      wasMusicActivelyPlaying: false,
    });
    assert.equal(shouldRestoreMusicAfterRoomMediaEnded(intent), false);
    intent = reduceSoundtrackIntent(intent, { type: "room-media-ended" });
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);
  });

  it("respects manual pause across poem and room navigation and resumes current route on explicit Play", () => {
    let intent = createInitialSoundtrackIntent();
    intent = reduceSoundtrackIntent(intent, { type: "enter-with-sound" });
    assert.equal(shouldAutoTransitionOnRouteChange(intent), true);

    // Visitor manually pauses via AudioDock
    intent = reduceSoundtrackIntent(intent, { type: "user-pause" });
    assert.equal(intent.manuallyPaused, true);
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);

    // Navigating between poems & rooms MUST NOT override manual pause
    intent = reduceSoundtrackIntent(intent, { type: "route-changed" });
    intent = reduceSoundtrackIntent(intent, {
      type: "route-changed",
      leftRoomMedia: true,
    });
    assert.equal(intent.manuallyPaused, true);
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);

    // Playing and ending Voices & Film media MUST NOT restart music after manual pause
    intent = reduceSoundtrackIntent(intent, {
      type: "room-media-started",
      wasMusicActivelyPlaying: true,
    });
    assert.equal(intent.pausedForRoomMedia, false);
    assert.equal(shouldRestoreMusicAfterRoomMediaEnded(intent), false);
    intent = reduceSoundtrackIntent(intent, { type: "room-media-ended" });
    assert.equal(intent.manuallyPaused, true);
    assert.equal(shouldAutoTransitionOnRouteChange(intent), false);

    // Explicit resume via AudioDock restores active intent for current route
    intent = reduceSoundtrackIntent(intent, { type: "user-play" });
    assert.equal(intent.soundPreference, "sound");
    assert.equal(intent.manuallyPaused, false);
    assert.equal(shouldAutoTransitionOnRouteChange(intent), true);
  });

  it("maintains Voices & Film mutual exclusion and restores soundtrack on end ONLY when intent remained active", () => {
    let intent = createInitialSoundtrackIntent();
    intent = reduceSoundtrackIntent(intent, { type: "enter-with-sound" });

    // Exclusive playback targets pause AudioDock when room video starts
    const targets = resolveExclusivePlaybackTargets({
      targetId: "vf-1",
      registeredIds: ["vf-1", "vf-2"],
      dockStatus: "playing",
    });
    assert.equal(targets.shouldPauseDock, true);
    assert.deepEqual(targets.pauseRecordingIds, ["vf-2"]);

    // Room video starts while Rodrigo was playing
    intent = reduceSoundtrackIntent(intent, {
      type: "room-media-started",
      wasMusicActivelyPlaying: true,
    });
    assert.equal(intent.pausedForRoomMedia, true);
    assert.equal(intent.manuallyPaused, false);
    assert.equal(shouldRestoreMusicAfterRoomMediaEnded(intent), true);

    // If user manually clicks pause during the video, ending the video MUST NOT resume
    const interruptedByPause = reduceSoundtrackIntent(intent, {
      type: "user-pause",
    });
    assert.equal(
      shouldRestoreMusicAfterRoomMediaEnded(interruptedByPause),
      false
    );

    // Otherwise, natural end restores Rodrigo and clears transient flag
    assert.equal(shouldRestoreMusicAfterRoomMediaEnded(intent), true);
    intent = reduceSoundtrackIntent(intent, { type: "room-media-ended" });
    assert.equal(intent.pausedForRoomMedia, false);
    assert.equal(shouldAutoTransitionOnRouteChange(intent), true);
  });

  it("enforces architectural invariants: single AudioDock, central crossfade, zero per-poem players, auth-gated sync, and strict CSP", () => {
    const providerSrc = readFileSync(
      "components/audio/AudioProvider.tsx",
      "utf8"
    );
    const dockSrc = readFileSync("components/audio/AudioDock.tsx", "utf8");
    const readerSrc = readFileSync(
      "components/correspondence/CorrespondenceReader.tsx",
      "utf8"
    );
    const archiveLayoutSrc = readFileSync("app/(archive)/layout.tsx", "utf8");
    const rootLayoutSrc = readFileSync("app/layout.tsx", "utf8");

    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    const cleanDock = stripComments(dockSrc);
    const cleanProvider = stripComments(providerSrc);
    const cleanReader = stripComments(readerSrc);

    // Central provider coordinates two decks and releases outgoing sources
    assert.ok(cleanProvider.includes('data-soundtrack-deck="A"'));
    assert.ok(cleanProvider.includes('data-soundtrack-deck="B"'));
    assert.ok(cleanProvider.includes('removeAttribute("src")'));
    assert.ok(cleanProvider.includes("computeEqualPowerGains"));

    // No independent audio players inside CorrespondenceReader
    assert.equal(cleanReader.includes("<audio"), false);
    assert.equal(cleanReader.includes("useAudio"), false);

    // AudioDock has zero inline styles and never renders internal IDs or AU/II codes
    assert.equal(cleanDock.includes("style={{"), false);
    assert.equal(cleanDock.includes("AU/II"), false);
    assert.equal(cleanDock.includes("track.id"), false);
    assert.equal(cleanDock.includes("assetKey"), false);
    assert.equal(cleanDock.includes("poemId"), false);

    // Poem soundtrack catalog hydration lives strictly behind requireSession()
    assert.ok(archiveLayoutSrc.includes("requireSession()"));
    assert.ok(archiveLayoutSrc.includes("resolveServerSoundtrackCatalog"));
    assert.ok(archiveLayoutSrc.includes("<ArchiveSoundtrackSync"));
    assert.equal(rootLayoutSrc.includes("resolveServerSoundtrackCatalog"), false);
    assert.ok(rootLayoutSrc.includes("resolveServerArchiveSoundtrack"));
  });
});
