import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ORIGINAL_FOR_YOU_POEM_TEXT } from "../content/artifacts/correspondence.ts";
import {
  canSubmitPassphrase,
  createInitialThresholdState,
  resolveEntryAudioAction,
  resolveUnlockResponse,
} from "../lib/threshold/state.ts";
import { isAuthorizedAudioConfigured } from "../lib/audio/availability.ts";

describe("Milestone 2.1 Threshold state machine", () => {
  it("starts in initial state when unauthenticated and accepted state when session persists", () => {
    const unauth = createInitialThresholdState(false);
    assert.equal(unauth.status, "initial");
    assert.equal(unauth.rejectionMessage, null);

    const persisted = createInitialThresholdState(true);
    assert.equal(persisted.status, "accepted");
    assert.equal(persisted.rejectionMessage, null);
  });

  it("prevents empty and duplicate submissions during pending and accepted states", () => {
    assert.equal(canSubmitPassphrase("initial", ""), false);
    assert.equal(canSubmitPassphrase("initial", "passphrase"), true);
    assert.equal(canSubmitPassphrase("rejected", "retry"), true);
    assert.equal(canSubmitPassphrase("pending", "passphrase"), false);
    assert.equal(canSubmitPassphrase("accepted", "passphrase"), false);
  });

  it("maps server unlock responses to quiet neutral rejected or accepted states", () => {
    const okState = resolveUnlockResponse(200, true);
    assert.equal(okState.status, "accepted");
    assert.equal(okState.rejectionMessage, null);

    const wrongState = resolveUnlockResponse(401, false);
    assert.equal(wrongState.status, "rejected");
    assert.equal(wrongState.rejectionMessage, "Not recognized.");

    const limitedState = resolveUnlockResponse(429, false);
    assert.equal(limitedState.status, "rejected");
    assert.match(limitedState.rejectionMessage ?? "", /wait/i);

    const unconfiguredState = resolveUnlockResponse(503, false);
    assert.equal(unconfiguredState.status, "rejected");
    assert.ok(unconfiguredState.rejectionMessage);
  });

  it("provides a truthful fallback when no authorized audio source is configured", () => {
    assert.equal(isAuthorizedAudioConfigured(), false);

    const soundUnavailable = resolveEntryAudioAction("sound", false);
    assert.equal(soundUnavailable.mode, "sound-unavailable");
    assert.equal(soundUnavailable.shouldInitiateAudio, false);
    assert.match(soundUnavailable.notice ?? "", /in silence/i);

    const silenceChoice = resolveEntryAudioAction("silence", false);
    assert.equal(silenceChoice.mode, "silence");
    assert.equal(silenceChoice.shouldInitiateAudio, false);
    assert.equal(silenceChoice.notice, null);

    const soundReady = resolveEntryAudioAction("sound", true);
    assert.equal(soundReady.mode, "sound");
    assert.equal(soundReady.shouldInitiateAudio, true);
    assert.equal(soundReady.notice, null);
  });
});

describe("Milestone 2.1 design tokens, reduced-motion, and literary preservation", () => {
  it("defines all four room grounds, typography roles, and reduced-motion rules without brass accents", () => {
    const css = readFileSync("app/globals.css", "utf8");

    assert.ok(css.includes("--room-void:"));
    assert.ok(css.includes("--room-stillness:"));
    assert.ok(css.includes("--room-correspondence:"));
    assert.ok(css.includes("--room-voices-film:"));
    assert.ok(css.includes("--room-cadenza:"));
    assert.ok(css.includes("--font-serif:"));
    assert.ok(css.includes("--font-sans:"));
    assert.ok(css.includes("--font-mono:"));
    assert.ok(css.includes("--font-devanagari:"));
    assert.ok(css.includes("--text-poetry-devanagari:"));
    assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
    assert.equal(css.includes("--color-brass"), false);
  });

  it("preserves the original Devanagari poem verbatim (475 characters)", () => {
    assert.equal(ORIGINAL_FOR_YOU_POEM_TEXT.length, 475);
    assert.ok(ORIGINAL_FOR_YOU_POEM_TEXT.startsWith("तेरी आखों में जो देखा"));
    assert.ok(ORIGINAL_FOR_YOU_POEM_TEXT.endsWith("फ़ना हो जाना हो।"));
  });
});
