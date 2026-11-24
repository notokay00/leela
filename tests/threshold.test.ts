import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

  it("renders the Threshold weeping willow strictly decoratively with reduced-motion support and no text hint", () => {
    const backdrop = readFileSync(
      "components/threshold/ThresholdWillowBackdrop.tsx",
      "utf8"
    );
    const experience = readFileSync(
      "components/threshold/ThresholdExperience.tsx",
      "utf8"
    );
    const css = readFileSync("app/globals.css", "utf8");

    const stripCommentsAndExpressions = (source: string) => {
      const exportIdx = source.indexOf("export function ");
      const componentSection = exportIdx >= 0 ? source.slice(exportIdx) : source;
      const returnIdx = componentSection.indexOf("return (");
      const jsxSection =
        returnIdx >= 0 ? componentSection.slice(returnIdx) : componentSection;
      return jsxSection
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/\{[^{}]*\}/g, "");
    };

    assert.ok(experience.includes("<ThresholdWillowBackdrop"));
    assert.ok(backdrop.includes('aria-hidden="true"'));
    assert.ok(backdrop.includes("pointer-events-none"));
    assert.ok(backdrop.includes('alt=""'));
    assert.ok(backdrop.includes("/images/threshold-garden-desktop.webp"));
    assert.ok(backdrop.includes("/images/threshold-garden-mobile.webp"));
    assert.ok(existsSync("public/images/threshold-garden-desktop.webp"));
    assert.ok(existsSync("public/images/threshold-garden-mobile.webp"));
    assert.equal(backdrop.includes("style={{"), false);
    assert.equal(backdrop.includes("<title"), false);
    assert.equal(backdrop.includes("<desc"), false);
    assert.equal(backdrop.includes("<text"), false);
    assert.equal(backdrop.includes("aria-label"), false);
    assert.equal(experience.toLowerCase().includes("willow"), true); // import name only
    assert.equal(
      />[^<]*willow[^<]*</i.test(stripCommentsAndExpressions(experience)),
      false
    );
    assert.equal(
      />[^<]*willow[^<]*</i.test(stripCommentsAndExpressions(backdrop)),
      false
    );

    assert.ok(css.includes(".threshold-storybook"));
    assert.ok(css.includes(".willow-curtain"));
    assert.ok(css.includes(".willow-tip-cluster"));
    assert.ok(css.includes(".willow-ref-coupled"));
    assert.ok(css.includes(".willow-ref-stratum"));
    assert.ok(css.includes(".threshold-lake-ripple"));
    assert.ok(css.includes(".threshold-sunbeam"));
    assert.ok(css.includes(".threshold-dapple-pool"));
    assert.ok(css.includes(".threshold-pollen-mote"));
    assert.ok(css.includes("willowBreezeA"));
    assert.ok(css.includes("willowTipFollowA"));
    assert.ok(css.includes("willowReflectCoupledA"));
    assert.ok(css.includes("lakeStratumWaveA"));
    assert.ok(css.includes("lakeRippleTravelA"));
    assert.ok(css.includes("animation: none;"));
    assert.ok(backdrop.includes('clipPath="url(#desk-lake-clip)"'));
    assert.ok(backdrop.includes('clipPath="url(#mob-lake-clip)"'));
  });
});
