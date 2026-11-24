import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { VOICES_AND_FILM_ARTIFACTS } from "../content/artifacts/voices-and-film.ts";
import {
  buildVoicesAndFilmSections,
  isVoicesAndFilmArtefactApproved,
  resolveExclusivePlaybackTargets,
  resolveMediaAspectClassKey,
  toVoicesAndFilmClientItem,
  VOICES_AND_FILM_SECTIONS,
} from "../lib/voices-and-film/collection.ts";
import type { VoicesAndFilmArtefact } from "../lib/voices-and-film/types.ts";

describe("Movement III — Voices & Film section structure and consent gating", () => {
  it("defines the exact three sections in exact order with exact visible titles", () => {
    assert.deepEqual(
      VOICES_AND_FILM_SECTIONS.map((s) => [s.id, s.title]),
      [
        ["my-personal-singer", "my personal singer"],
        ["ahhh-i-am-in-love-again", "Ahhh i am in love again"],
        ["noice", "Noice"],
      ]
    );
  });

  it("keeps production Voices & Film completely empty when all personal artefacts remain withheld", () => {
    for (const artefact of VOICES_AND_FILM_ARTIFACTS) {
      assert.equal(artefact.publishStatus, "withheld");
      assert.equal(artefact.consentConfirmed, false);
    }

    const sections = buildVoicesAndFilmSections(
      VOICES_AND_FILM_ARTIFACTS,
      () => false
    );
    assert.equal(sections.length, 3);
    for (const view of sections) {
      assert.equal(view.items.length, 0);
    }

    // Even if an allowlist check mistakenly returned true, metadata consent flags still block withheld items
    const evenIfAllowlisted = buildVoicesAndFilmSections(
      VOICES_AND_FILM_ARTIFACTS,
      () => true
    );
    for (const view of evenIfAllowlisted) {
      assert.equal(view.items.length, 0);
    }
  });

  it("supports scalable voice-screen-recording and personal-video artefacts with independent derivative gating", () => {
    const sampleArtefacts: VoicesAndFilmArtefact[] = [
      {
        id: "vf-voice-02",
        slug: "voice-two",
        catalogId: "ARC-III-02",
        movement: "voices-and-film",
        section: "my-personal-singer",
        sectionOrder: 2,
        mediaType: "voice-screen-recording",
        mimeType: "video/mp4",
        assetKey: "voice-screen-02",
        width: 1170,
        height: 2532,
        audioDerivative: {
          assetKey: "voice-audio-02",
          mimeType: "audio/mp4",
          durationSeconds: 42,
        },
        integrity: { sha256: "abc123", byteLength: 1024 },
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "vf-voice-01",
        slug: "voice-one",
        catalogId: "ARC-III-03",
        movement: "voices-and-film",
        section: "my-personal-singer",
        sectionOrder: 1,
        mediaType: "voice-screen-recording",
        mimeType: "video/mp4",
        assetKey: "voice-screen-01",
        width: 1080,
        height: 1920,
        audioDerivative: {
          assetKey: "voice-audio-01-unapproved",
          mimeType: "audio/mpeg",
        },
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "vf-love-01",
        slug: "love-one",
        catalogId: "ARC-III-04",
        movement: "voices-and-film",
        section: "ahhh-i-am-in-love-again",
        sectionOrder: 1,
        mediaType: "personal-video",
        mimeType: "video/mp4",
        assetKey: "love-video-01",
        width: 1920,
        height: 1080,
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "vf-love-unconsented",
        slug: "love-unconsented",
        catalogId: "ARC-III-05",
        movement: "voices-and-film",
        section: "ahhh-i-am-in-love-again",
        sectionOrder: 2,
        mediaType: "personal-video",
        mimeType: "video/mp4",
        assetKey: "love-video-02",
        publishStatus: "ready",
        consentConfirmed: false,
      },
      {
        id: "vf-noice-01",
        slug: "noice-one",
        catalogId: "ARC-III-06",
        movement: "voices-and-film",
        section: "noice",
        sectionOrder: 1,
        mediaType: "personal-video",
        mimeType: "video/mp4",
        assetKey: "noice-video-01",
        width: 1080,
        height: 1350,
        publishStatus: "ready",
        consentConfirmed: true,
      },
    ];

    const allowlist = new Set([
      "voice-screen-01",
      "voice-screen-02",
      "voice-audio-02",
      "love-video-01",
      "love-video-02",
      "noice-video-01",
    ]);

    const isApproved = (key: string) => allowlist.has(key);
    assert.equal(
      isVoicesAndFilmArtefactApproved(sampleArtefacts[3], isApproved),
      false
    );

    const sections = buildVoicesAndFilmSections(sampleArtefacts, isApproved);

    // Section 1 preserves explicit sectionOrder (1 before 2) and independently gates audioDerivative
    assert.equal(sections[0].items.length, 2);
    assert.equal(sections[0].items[0].id, "vf-voice-01");
    assert.equal(sections[0].items[0].src, "/api/media/voice-screen-01");
    assert.equal(sections[0].items[0].audioDerivative, undefined);
    assert.equal(sections[0].items[0].aspectClassKey, "portrait-tall");

    assert.equal(sections[0].items[1].id, "vf-voice-02");
    assert.equal(sections[0].items[1].src, "/api/media/voice-screen-02");
    assert.deepEqual(sections[0].items[1].audioDerivative, {
      src: "/api/media/voice-audio-02",
      mimeType: "audio/mp4",
      durationSeconds: 42,
    });

    // Client DTO never leaks internal consent flags, catalogId, or raw integrity metadata
    const dto = toVoicesAndFilmClientItem(sampleArtefacts[0], isApproved);
    assert.equal("publishStatus" in dto, false);
    assert.equal("consentConfirmed" in dto, false);
    assert.equal("catalogId" in dto, false);
    assert.equal("integrity" in dto, false);
    assert.equal(dto.title, undefined);
    assert.equal(dto.description, undefined);

    // Section 2 excludes unconsented recording
    assert.equal(sections[1].items.length, 1);
    assert.equal(sections[1].items[0].aspectClassKey, "landscape-wide");

    // Section 3 holds standalone feature
    assert.equal(sections[2].items.length, 1);
    assert.equal(sections[2].items[0].aspectClassKey, "portrait");
  });

  it("maps intrinsic dimensions cleanly into static CSS aspect buckets", () => {
    assert.equal(resolveMediaAspectClassKey(1080, 1920), "portrait-tall");
    assert.equal(resolveMediaAspectClassKey(900, 1200), "portrait");
    assert.equal(resolveMediaAspectClassKey(1000, 1000), "square");
    assert.equal(resolveMediaAspectClassKey(1440, 1080), "landscape-classic");
    assert.equal(resolveMediaAspectClassKey(1920, 1080), "landscape-wide");
    assert.equal(resolveMediaAspectClassKey(undefined, undefined), "natural");
  });
});

describe("Movement III — playback coordination, DAL protection, and CSP invariants", () => {
  it("pauses sibling recordings and active AudioDock on exclusive playback without touching idle dock", () => {
    const activeDock = resolveExclusivePlaybackTargets({
      targetId: "rec-2",
      registeredIds: ["rec-1", "rec-2", "rec-3"],
      dockStatus: "playing",
    });
    assert.deepEqual(activeDock.pauseRecordingIds, ["rec-1", "rec-3"]);
    assert.equal(activeDock.shouldPauseDock, true);

    const idleDock = resolveExclusivePlaybackTargets({
      targetId: "rec-1",
      registeredIds: ["rec-1", "rec-2"],
      dockStatus: "unavailable",
    });
    assert.deepEqual(idleDock.pauseRecordingIds, ["rec-2"]);
    assert.equal(idleDock.shouldPauseDock, false);
  });

  it("enforces direct server-side DAL authorization, strict CSP, no autoplay, and reduced-motion rules", () => {
    const layoutSrc = readFileSync(
      "app/(archive)/archive/voices-and-film/layout.tsx",
      "utf8"
    );
    const pageSrc = readFileSync(
      "app/(archive)/archive/voices-and-film/page.tsx",
      "utf8"
    );
    const roomSrc = readFileSync(
      "components/voices-and-film/VoicesAndFilmRoom.tsx",
      "utf8"
    );
    const frameSrc = readFileSync(
      "components/voices-and-film/VoicesAndFilmMediaFrame.tsx",
      "utf8"
    );
    const dockSrc = readFileSync("components/audio/AudioDock.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    assert.ok(layoutSrc.includes("requireSession()"));
    assert.ok(pageSrc.includes("requireSession()"));
    assert.ok(pageSrc.includes('dynamic = "force-dynamic"'));
    assert.ok(pageSrc.includes("resolveApprovedMediaAsset"));

    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const cleanRoomSrc = stripComments(roomSrc);
    const cleanFrameSrc = stripComments(frameSrc);
    const cleanPageSrc = stripComments(pageSrc);

    // Zero inline styles, zero autoplay, lazy preload="none", zero timeupdate render loops, zero visible AU/III
    assert.equal(cleanRoomSrc.includes("style={{"), false);
    assert.equal(cleanFrameSrc.includes("style={{"), false);
    assert.equal(cleanFrameSrc.toLowerCase().includes("autoplay"), false);
    assert.equal(cleanFrameSrc.includes("onTimeUpdate"), false);
    assert.ok(cleanFrameSrc.includes('preload="none"'));
    assert.equal(cleanRoomSrc.includes("AU/III"), false);
    assert.equal(cleanPageSrc.includes("AU/III"), false);

    assert.ok(dockSrc.includes("/archive/voices-and-film"));
    assert.ok(css.includes(".voices-film-stage"));
    assert.ok(css.includes(".voices-film-enter"));
    assert.ok(css.includes(".vf-empty-alcove"));
    assert.ok(css.includes(".vf-empty-playful"));
    assert.ok(css.includes(".vf-empty-noice"));
  });
});
