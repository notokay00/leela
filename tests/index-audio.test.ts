import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ARCHIVE_COLLECTION_DESCRIPTION,
  ARCHIVE_MOVEMENTS,
  getMovementHref,
  type ArchiveMovementEntry,
} from "../content/movements.ts";
import {
  clampVolume,
  createInitialAudioState,
  DEFAULT_AUDIO_CUE_TITLE,
  formatAudioStatusLabel,
  reduceAudioMediaEvent,
} from "../lib/audio/state.ts";

describe("Milestone 2.2 Editorial Index structure and active-room rules", () => {
  it("defines all four equal-weight movements with Roman numerals, AU references, and collection description", () => {
    assert.equal(
      ARCHIVE_COLLECTION_DESCRIPTION,
      "A collection of fragments and memories."
    );
    assert.equal(ARCHIVE_MOVEMENTS.length, 4);

    assert.deepEqual(
      ARCHIVE_MOVEMENTS.map((m) => [m.numeral, m.title, m.catalogueRef, m.groundToken]),
      [
        ["I", "Stillness", "AU/I", "stillness"],
        ["II", "Correspondence", "AU/II", "correspondence"],
        ["III", "Voices & Film", "AU/III", "voices-film"],
        ["IV", "Cadenza", "AU/IV", "cadenza"],
      ]
    );
  });

  it("activates navigation links ONLY for implemented rooms and keeps unimplemented rooms inert", () => {
    // In Milestone 2.2, no room is implemented yet so none produce dead links
    for (const movement of ARCHIVE_MOVEMENTS) {
      assert.equal(movement.implemented, false);
      assert.equal(getMovementHref(movement), null);
    }

    // When a room is explicitly implemented (Milestone 2.3+), href resolves cleanly
    const activeStillness: ArchiveMovementEntry = {
      ...ARCHIVE_MOVEMENTS[0],
      implemented: true,
    };
    assert.equal(getMovementHref(activeStillness), "/archive/stillness");
  });

  it("defines distinct room-colour sliver rules in globals.css and mounts AudioDock at root layout", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.ok(css.includes(".room-sliver-stillness"));
    assert.ok(css.includes(".room-sliver-correspondence"));
    assert.ok(css.includes(".room-sliver-voices-film"));
    assert.ok(css.includes(".room-sliver-cadenza"));

    const rootLayout = readFileSync("app/layout.tsx", "utf8");
    assert.ok(rootLayout.includes("<AudioProvider"));
    assert.ok(rootLayout.includes("<AudioDock"));
  });
});

describe("Milestone 2.2 Audio state machine driven strictly by real media events", () => {
  it("remains truthfully unavailable when no authorized recording is configured", () => {
    const initial = createInitialAudioState({ available: false, src: null });
    assert.equal(initial.available, false);
    assert.equal(initial.src, null);
    assert.equal(initial.cueTitle, DEFAULT_AUDIO_CUE_TITLE);
    assert.equal(initial.status, "unavailable");
    assert.equal(formatAudioStatusLabel(initial.status), "no recording");

    // Even if a spurious playing event were dispatched, unavailable state never fakes playback
    const afterPlaying = reduceAudioMediaEvent(initial, "playing");
    assert.equal(afterPlaying.status, "unavailable");
  });

  it("transitions strictly on real HTMLMediaElement events when an authorized source exists", () => {
    let state = createInitialAudioState({
      available: true,
      src: "/api/media/arc-score-aranjuez",
    });
    assert.equal(state.status, "idle");

    state = reduceAudioMediaEvent(state, "waiting");
    assert.equal(state.status, "waiting");
    assert.equal(formatAudioStatusLabel(state.status), "buffering");

    state = reduceAudioMediaEvent(state, "playing");
    assert.equal(state.status, "playing");
    assert.equal(formatAudioStatusLabel(state.status), "playing");

    state = reduceAudioMediaEvent(state, "pause");
    assert.equal(state.status, "paused");

    state = reduceAudioMediaEvent(state, "ended");
    assert.equal(state.status, "ended");

    // Trailing pause event after ended preserves ended state
    state = reduceAudioMediaEvent(state, "pause");
    assert.equal(state.status, "ended");

    state = reduceAudioMediaEvent(state, "error");
    assert.equal(state.status, "error");
  });

  it("clamps volume cleanly to [0, 1]", () => {
    assert.equal(clampVolume(-0.4), 0);
    assert.equal(clampVolume(1.8), 1);
    assert.equal(clampVolume(0.35), 0.35);
    assert.equal(clampVolume(Number.NaN), 0.7);
  });
});
