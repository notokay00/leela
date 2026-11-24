import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CADENZA_PASSAGES } from "../content/artifacts/cadenza.ts";
import {
  buildCadenzaMoments,
  clampCadenzaMomentIndex,
  isCadenzaPassageApproved,
  selectApprovedCadenzaPassages,
} from "../lib/cadenza/collection.ts";
import type { CadenzaPassage } from "../lib/cadenza/types.ts";

describe("Movement IV — Cadenza content architecture and consent gating", () => {
  it("contains zero fabricated personal writing in production and renders arrival, pause, and conclusion", () => {
    assert.equal(CADENZA_PASSAGES.length, 0);

    const approved = selectApprovedCadenzaPassages(CADENZA_PASSAGES);
    assert.equal(approved.length, 0);

    const moments = buildCadenzaMoments(approved);
    assert.deepEqual(
      moments.map((m) => m.kind),
      ["arrival", "pause", "conclusion"]
    );
  });

  it("strictly filters withheld, draft, unconsented, and blank passages while ordering approved writing", () => {
    const sample: CadenzaPassage[] = [
      {
        id: "p-2",
        order: 2,
        body: "Second line.",
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "p-withheld",
        order: 1,
        body: "Must never appear.",
        publishStatus: "withheld",
        consentConfirmed: false,
      },
      {
        id: "p-draft",
        order: 3,
        body: "Draft text.",
        publishStatus: "draft",
        consentConfirmed: true,
      },
      {
        id: "p-unconsented",
        order: 4,
        body: "No consent.",
        publishStatus: "ready",
        consentConfirmed: false,
      },
      {
        id: "p-blank",
        order: 5,
        body: "   \n  ",
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "p-1",
        order: 1,
        heading: "First",
        body: "First line.\nKept verbatim.",
        script: "Latin",
        publishStatus: "ready",
        consentConfirmed: true,
      },
    ];

    assert.equal(isCadenzaPassageApproved(sample[1]), false);
    assert.equal(isCadenzaPassageApproved(sample[4]), false);

    const approved = selectApprovedCadenzaPassages(sample);
    assert.equal(approved.length, 2);
    assert.equal(approved[0].id, "p-1");
    assert.equal(approved[0].heading, "First");
    assert.equal(approved[0].body, "First line.\nKept verbatim.");
    assert.equal(approved[1].id, "p-2");
    assert.equal(approved[1].heading, undefined);
    assert.equal("publishStatus" in approved[0], false);
    assert.equal("consentConfirmed" in approved[0], false);

    const moments = buildCadenzaMoments(approved);
    assert.deepEqual(
      moments.map((m) => m.kind),
      ["arrival", "passage", "passage", "conclusion"]
    );
  });

  it("clamps user-controlled moment navigation cleanly", () => {
    assert.equal(clampCadenzaMomentIndex(-2, 3), 0);
    assert.equal(clampCadenzaMomentIndex(0, 3), 0);
    assert.equal(clampCadenzaMomentIndex(2, 3), 2);
    assert.equal(clampCadenzaMomentIndex(9, 3), 2);
    assert.equal(clampCadenzaMomentIndex(Number.NaN, 3), 0);
  });
});

describe("Movement IV — Cadenza DAL security, emotional boundaries, and reduced motion", () => {
  it("enforces direct server-side DAL auth, zero timers, zero persuasion CTAs, strict CSP, and reduced-motion rules", () => {
    const layoutSrc = readFileSync(
      "app/(archive)/archive/cadenza/layout.tsx",
      "utf8"
    );
    const pageSrc = readFileSync(
      "app/(archive)/archive/cadenza/page.tsx",
      "utf8"
    );
    const roomSrc = readFileSync(
      "components/cadenza/CadenzaRoom.tsx",
      "utf8"
    );
    const dockSrc = readFileSync("components/audio/AudioDock.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const cleanRoom = stripComments(roomSrc);
    const cleanPage = stripComments(pageSrc);

    // Direct server-side DAL authentication & dynamic nonce rendering
    assert.ok(layoutSrc.includes("requireSession()"));
    assert.ok(pageSrc.includes("requireSession()"));
    assert.ok(pageSrc.includes('dynamic = "force-dynamic"'));

    // Strictly user-controlled: no timers or auto-advance
    assert.equal(cleanRoom.includes("setTimeout"), false);
    assert.equal(cleanRoom.includes("setInterval"), false);

    // Zero inline styles (CSP), zero catalogue taxonomy, zero Untitled placeholders
    assert.equal(cleanRoom.includes("style={{"), false);
    assert.equal(cleanRoom.includes("AU/IV"), false);
    assert.equal(cleanPage.includes("AU/IV"), false);
    assert.equal(cleanRoom.toLowerCase().includes("untitled"), false);

    // Emotional boundaries: no reply/contact/persuasion CTAs
    for (const forbidden of [
      "mailto:",
      "tel:",
      "reply",
      "contact",
      "forgive",
      "write back",
      "message me",
      "reconnect",
    ]) {
      assert.equal(
        cleanRoom.toLowerCase().includes(forbidden),
        false,
        `Cadenza must never include persuasion/contact token: ${forbidden}`
      );
    }

    // Quiet dignified ending controls & light AudioDock + reduced-motion support
    assert.ok(cleanRoom.includes("Return to the Index"));
    assert.ok(cleanRoom.includes("Leave the archive"));
    assert.ok(cleanRoom.includes("/api/auth/lock"));
    assert.ok(dockSrc.includes("/archive/cadenza"));
    assert.ok(css.includes(".cadenza-stage"));
    assert.ok(css.includes(".cadenza-moment-enter"));
    assert.ok(css.includes(".cadenza-ground-enter"));
  });
});
