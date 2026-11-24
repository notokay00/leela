import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CORRESPONDENCE_ARTIFACTS,
  ORIGINAL_FOR_YOU_POEM_TEXT,
} from "../content/artifacts/correspondence.ts";
import {
  findApprovedArtefactBySlug,
  formatArtefactTypeLabel,
  formatLanguageMetadata,
  getReadingTextClass,
  isArtefactApproved,
  resolveReaderNavigation,
  selectApprovedCorrespondenceArtefacts,
  sortByCollectionOrder,
  toCatalogueEntry,
  validateCollectionIntegrity,
} from "../lib/correspondence/collection.ts";
import { SYNTHETIC_CORRESPONDENCE_FIXTURES } from "../lib/correspondence/synthetic-fixtures.ts";
import type { CorrespondenceArtefact } from "../lib/correspondence/types.ts";

const EXPECTED_ORIGINAL_POEM_SHA256 =
  "3fc9eafcb2c4f47287b2674dd1dfe07b98afac2c843418b67df90b85f2295b02";

describe("Correspondence original poem integrity and production privacy", () => {
  it("preserves ORIGINAL_FOR_YOU_POEM_TEXT byte-for-byte with unchanged withheld consent status", () => {
    const utf8 = Buffer.from(ORIGINAL_FOR_YOU_POEM_TEXT, "utf8");
    const sha256 = createHash("sha256").update(utf8).digest("hex");

    assert.equal(ORIGINAL_FOR_YOU_POEM_TEXT.length, 475);
    assert.equal(utf8.length, 1175);
    assert.equal(sha256, EXPECTED_ORIGINAL_POEM_SHA256);

    const entry = CORRESPONDENCE_ARTIFACTS.find(
      (item) => item.slug === "for-you-poem"
    );
    assert.ok(entry, "Original poem entry must exist in production registry");
    assert.equal(entry.originalText, ORIGINAL_FOR_YOU_POEM_TEXT);
    assert.equal(entry.catalogNumber, "AU/II-001");
    assert.equal(entry.publishStatus, "withheld");
    assert.equal(entry.consentConfirmed, false);
    assert.equal(isArtefactApproved(entry), false);
  });

  it("keeps production Correspondence empty while all entries remain withheld", () => {
    const integrity = validateCollectionIntegrity(CORRESPONDENCE_ARTIFACTS);
    assert.equal(integrity.valid, true, integrity.errors.join("; "));

    const approved = selectApprovedCorrespondenceArtefacts(
      CORRESPONDENCE_ARTIFACTS
    );
    assert.equal(approved.length, 0);
    assert.equal(
      findApprovedArtefactBySlug(CORRESPONDENCE_ARTIFACTS, "for-you-poem"),
      null
    );
  });

  it("strictly isolates synthetic fixtures from production routes and never includes the private poem", () => {
    for (const fixture of SYNTHETIC_CORRESPONDENCE_FIXTURES) {
      assert.ok(
        !fixture.originalText.includes("तेरी आखों में जो देखा"),
        "Synthetic fixtures must never contain the private Hindi poem"
      );
      assert.notEqual(fixture.slug, "for-you-poem");
    }

    const prodCataloguePage = readFileSync(
      "app/(archive)/archive/correspondence/page.tsx",
      "utf8"
    );
    const prodReaderPage = readFileSync(
      "app/(archive)/archive/correspondence/[slug]/page.tsx",
      "utf8"
    );
    assert.ok(!prodCataloguePage.includes("synthetic-fixtures"));
    assert.ok(!prodReaderPage.includes("synthetic-fixtures"));
  });
});

describe("Correspondence scalable collection architecture (30+ and 50+ entries)", () => {
  it("validates 30+ synthetic fixtures covering types, languages, untitled, undated, and separate translations", () => {
    const integrity = validateCollectionIntegrity(
      SYNTHETIC_CORRESPONDENCE_FIXTURES
    );
    assert.equal(integrity.valid, true, integrity.errors.join("; "));

    const approved = selectApprovedCorrespondenceArtefacts(
      SYNTHETIC_CORRESPONDENCE_FIXTURES
    );
    assert.ok(
      approved.length >= 30,
      `Expected at least 30 approved synthetic fixtures, got ${approved.length}`
    );

    // Covers all 4 artefact types
    const types = new Set(approved.map((item) => item.type));
    assert.ok(types.has("poem"));
    assert.ok(types.has("letter"));
    assert.ok(types.has("fragment"));
    assert.ok(types.has("other"));

    // Covers Devanagari, Latin, and Mixed scripts
    const scripts = new Set(approved.map((item) => item.script));
    assert.ok(scripts.has("Devanagari"));
    assert.ok(scripts.has("Latin"));
    assert.ok(scripts.has("Mixed"));

    // Includes untitled entries, undated entries, and separate translations
    assert.ok(approved.some((item) => item.title === undefined));
    assert.ok(approved.some((item) => item.createdAt === undefined));
    const withTranslation = approved.find(
      (item) => (item.translations?.length ?? 0) > 0
    );
    assert.ok(withTranslation, "Must include separate translation fixture");
    assert.notEqual(
      withTranslation.originalText,
      withTranslation.translations?.[0]?.text
    );
  });

  it("orders strictly by explicit collectionOrder (not chronologically) and scales smoothly past 50 items", () => {
    const fiftyFive: CorrespondenceArtefact[] = Array.from(
      { length: 55 },
      (_, idx) => {
        const order = 55 - idx; // intentionally reversed input order & inverted dates
        const padded = String(order).padStart(3, "0");
        return {
          id: `scale-${padded}`,
          slug: `scale-poem-${padded}`,
          catalogNumber: `AU/II-${padded}`,
          collectionOrder: order,
          type: "poem",
          title: `Scale Test ${padded}`,
          originalText: `Synthetic line for item ${padded}`,
          language: "en",
          script: "Latin",
          createdAt: `2024-01-${String((idx % 28) + 1).padStart(2, "0")}`,
          publishStatus: "ready",
          consentConfirmed: true,
        };
      }
    );

    const ordered = sortByCollectionOrder(fiftyFive);
    assert.equal(ordered.length, 55);
    assert.equal(ordered[0].catalogNumber, "AU/II-001");
    assert.equal(ordered[24].catalogNumber, "AU/II-025");
    assert.equal(ordered[54].catalogNumber, "AU/II-055");

    const navMid = resolveReaderNavigation(ordered, "scale-poem-030");
    assert.equal(navMid.position, 30);
    assert.equal(navMid.total, 55);
    assert.equal(navMid.previous?.catalogNumber, "AU/II-029");
    assert.equal(navMid.next?.catalogNumber, "AU/II-031");
  });

  it("projects catalogue entries without leaking originalText or auto-excerpts", () => {
    const sample = SYNTHETIC_CORRESPONDENCE_FIXTURES[0];
    const projected = toCatalogueEntry(sample) as unknown as Record<
      string,
      unknown
    >;
    assert.equal(projected.catalogNumber, "TEST/II-001");
    assert.equal("originalText" in projected, false);
    assert.equal("translations" in projected, false);
  });
});

describe("Correspondence withheld filtering and Previous/Next navigation", () => {
  it("skips withheld artefacts cleanly in Previous/Next and returns null for direct withheld slug lookup", () => {
    // Raw synthetic fixture #4 (TEST/II-004) is withheld between TEST/II-003 and TEST/II-005
    assert.equal(
      findApprovedArtefactBySlug(
        SYNTHETIC_CORRESPONDENCE_FIXTURES,
        "synthetic-withheld-fixture-04"
      ),
      null
    );

    const approved = selectApprovedCorrespondenceArtefacts(
      SYNTHETIC_CORRESPONDENCE_FIXTURES
    );
    assert.ok(
      !approved.some((item) => item.slug === "synthetic-withheld-fixture-04")
    );

    // Entry 3 -> Next skips withheld entry 4 and points straight to entry 5 without modifying catalogNumber
    const nav3 = resolveReaderNavigation(
      approved,
      "synthetic-untitled-fragment-03"
    );
    assert.equal(nav3.previous?.catalogNumber, "TEST/II-002");
    assert.equal(nav3.next?.catalogNumber, "TEST/II-005");
    assert.equal(nav3.next?.slug, "synthetic-long-english-poem-05");

    // Entry 5 -> Previous points cleanly back to entry 3
    const nav5 = resolveReaderNavigation(
      approved,
      "synthetic-long-english-poem-05"
    );
    assert.equal(nav5.previous?.catalogNumber, "TEST/II-003");
    assert.equal(nav5.previous?.slug, "synthetic-untitled-fragment-03");

    // First and last boundaries
    const firstNav = resolveReaderNavigation(approved, approved[0].slug);
    assert.equal(firstNav.previous, null);
    assert.equal(firstNav.position, 1);

    const lastNav = resolveReaderNavigation(
      approved,
      approved[approved.length - 1].slug
    );
    assert.equal(lastNav.next, null);
    assert.equal(lastNav.position, approved.length);
  });

  it("maps explicit language/script metadata and artefact types cleanly including future languages", () => {
    assert.equal(
      getReadingTextClass("Devanagari", "hi"),
      "correspondence-verse-devanagari"
    );
    assert.equal(
      getReadingTextClass("Mixed", "hi-en"),
      "correspondence-verse-mixed"
    );
    assert.equal(
      getReadingTextClass("Latin", "en"),
      "correspondence-verse-latin"
    );
    assert.equal(formatArtefactTypeLabel("poem"), "Poem");
    assert.equal(formatArtefactTypeLabel("letter"), "Letter");
    assert.equal(formatArtefactTypeLabel("fragment"), "Fragment");
    assert.equal(formatArtefactTypeLabel("other", "Marginalia"), "Marginalia");
    assert.equal(formatLanguageMetadata("hi", "Devanagari"), "Hindi · Devanagari");
    assert.equal(formatLanguageMetadata("ur", "Nastaliq"), "Urdu · Nastaliq");
  });

  it("defines warm literary paper tokens, Devanagari shaping rules, 1.5s transition, and reduced-motion in globals.css", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.ok(css.includes("--room-correspondence: #ede6d9;"));
    assert.ok(css.includes("--room-correspondence-surface: #e5dccb;"));
    assert.ok(css.includes("--room-correspondence-elevated: #f3eee5;"));
    assert.ok(css.includes("--ink-paper-primary: #29251f;"));
    assert.ok(css.includes("--hairline-paper: #cec4b4;"));
    assert.ok(css.includes(".correspondence-ground-enter"));
    assert.ok(css.includes("1500ms"));
    assert.ok(css.includes(".correspondence-verse-devanagari"));
    assert.ok(css.includes("letter-spacing: 0;"));
    assert.ok(css.includes("white-space: pre-wrap;"));
  });
});
