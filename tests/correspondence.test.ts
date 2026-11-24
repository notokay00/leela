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
import {
  detectCorrespondenceSwipe,
  shouldCancelSwipeForVerticalScroll,
} from "../lib/correspondence/swipe.ts";
import { SYNTHETIC_CORRESPONDENCE_FIXTURES } from "../lib/correspondence/synthetic-fixtures.ts";
import type { CorrespondenceArtefact } from "../lib/correspondence/types.ts";

/**
 * Authoritative first-edition manifest expectations (AU/II-001 through AU/II-023):
 * exact catalogue number, stable id, slug, title, language, script, and UTF-8 SHA-256.
 */
const EXPECTED_FIRST_EDITION: readonly {
  order: number;
  catalogNumber: string;
  id: string;
  slug: string;
  title: string;
  language: string;
  script: string;
  sha256: string;
}[] = [
  {
    order: 1,
    catalogNumber: "AU/II-001",
    id: "correspondence-001",
    slug: "for-you-poem",
    title: "For You",
    language: "hi",
    script: "Devanagari",
    sha256: "3fc9eafcb2c4f47287b2674dd1dfe07b98afac2c843418b67df90b85f2295b02",
  },
  {
    order: 2,
    catalogNumber: "AU/II-002",
    id: "correspondence-002",
    slug: "poem-002",
    title: "यादों का मौसम",
    language: "hi",
    script: "Devanagari",
    sha256: "94f8d644a90ca834b0afa5ba47946aef299f3612b20c20d747861a9d69ae4c78",
  },
  {
    order: 3,
    catalogNumber: "AU/II-003",
    id: "correspondence-003",
    slug: "poem-003",
    title: "रक़ीब",
    language: "hi",
    script: "Devanagari",
    sha256: "fe5cc86ff806f7c12f38488703d8547ea4ba2cc31d6dba4768fdd6a93818aad5",
  },
  {
    order: 4,
    catalogNumber: "AU/II-004",
    id: "correspondence-004",
    slug: "poem-004",
    title: "एहतिसाब",
    language: "hi",
    script: "Devanagari",
    sha256: "8dfc01e0c9770fc8db84614648a063358a1870cdc81a41c6f2dfa487074f2a61",
  },
  {
    order: 5,
    catalogNumber: "AU/II-005",
    id: "correspondence-005",
    slug: "poem-005",
    title: "सुलगती यादें",
    language: "hi",
    script: "Devanagari",
    sha256: "4fad62566c2f38f186062524ab1f3af9e33a5a2d8399b7d16fa2911aa4461502",
  },
  {
    order: 6,
    catalogNumber: "AU/II-006",
    id: "correspondence-006",
    slug: "poem-006",
    title: "मसला",
    language: "hi",
    script: "Devanagari",
    sha256: "ab1837393eec3a70351bf421ddf0adf0d95ba981cd6722e534bc120e13e7386d",
  },
  {
    order: 7,
    catalogNumber: "AU/II-007",
    id: "correspondence-007",
    slug: "poem-007",
    title: "मशरिक़",
    language: "hi",
    script: "Devanagari",
    sha256: "55647dd9dcf6eb887f94d76de7a8db592d0c2e0d0309567b5d384f13608a0306",
  },
  {
    order: 8,
    catalogNumber: "AU/II-008",
    id: "correspondence-008",
    slug: "poem-008",
    title: "गुलाम",
    language: "hi",
    script: "Devanagari",
    sha256: "c1b150328eadf21a8587581e309e51a15fdecb47f03ea4e8c29aa21c0e04a4b6",
  },
  {
    order: 9,
    catalogNumber: "AU/II-009",
    id: "correspondence-009",
    slug: "poem-009",
    title: "ख़्वाहिश",
    language: "hi",
    script: "Devanagari",
    sha256: "555c5c068185c4156c8636e131fc9bc7edbc830f5ef1ec22714b60d70ec9a546",
  },
  {
    order: 10,
    catalogNumber: "AU/II-010",
    id: "correspondence-010",
    slug: "poem-010",
    title: "रौशनी की दहलीज़",
    language: "hi",
    script: "Devanagari",
    sha256: "194ea55239d97d247370e67d045e6c901bed5522483416303a53572eef0a705b",
  },
  {
    order: 11,
    catalogNumber: "AU/II-011",
    id: "correspondence-011",
    slug: "poem-011",
    title: "तू ही काफ़ी है",
    language: "hi",
    script: "Devanagari",
    sha256: "80ec70433bd090d03c74774a3119835561004770df81acbec8b0cd4f8006514e",
  },
  {
    order: 12,
    catalogNumber: "AU/II-012",
    id: "correspondence-012",
    slug: "poem-012",
    title: "मेरा आख़िरी दीन",
    language: "hi",
    script: "Devanagari",
    sha256: "b00d1244673b760e74d07756bf803cc76faa69c2c1a03cb24adb7c1595e5cb96",
  },
  {
    order: 13,
    catalogNumber: "AU/II-013",
    id: "correspondence-013",
    slug: "poem-013",
    title: "ख़्वाबों की आग़ोश",
    language: "hi",
    script: "Devanagari",
    sha256: "a8fbcead3ee8415816acefab6107d302ae0806f89b7bd87801fad264fed6049b",
  },
  {
    order: 14,
    catalogNumber: "AU/II-014",
    id: "correspondence-014",
    slug: "poem-014",
    title: "हैरत-ए-इश्क़",
    language: "hi",
    script: "Devanagari",
    sha256: "4b0c528baac120e9b23ec17ca127de1cfb28e8e671901b944743a4b24ee19e45",
  },
  {
    order: 15,
    catalogNumber: "AU/II-015",
    id: "correspondence-015",
    slug: "poem-015",
    title: "किस्मत नहीं, फ़ैसला",
    language: "hi",
    script: "Devanagari",
    sha256: "7974c282f2121b2a8664e0d51b3d2e2e066ccca4b82a40187495700f651e3483",
  },
  {
    order: 16,
    catalogNumber: "AU/II-016",
    id: "correspondence-016",
    slug: "poem-016",
    title: "रेत की इमारतें",
    language: "hi",
    script: "Devanagari",
    sha256: "cf8c53fefe05215f0507ad99603783141dc81a04ff178f195fcedad4db1b78fb",
  },
  {
    order: 17,
    catalogNumber: "AU/II-017",
    id: "correspondence-017",
    slug: "poem-017",
    title: "बचाव",
    language: "hi",
    script: "Devanagari",
    sha256: "caef22b888c9df1a95db2f3928099d9a6a1687f6ae4ae66781777bc63b5b1511",
  },
  {
    order: 18,
    catalogNumber: "AU/II-018",
    id: "correspondence-018",
    slug: "poem-018",
    title: "बे-निशाँ",
    language: "hi",
    script: "Devanagari",
    sha256: "6148bd493cd9def4acf9d7483f87c1c410d2e0d5823d6862b256825ce43d6790",
  },
  {
    order: 19,
    catalogNumber: "AU/II-019",
    id: "correspondence-019",
    slug: "poem-019",
    title: "एक आवाज़ का इंतज़ार",
    language: "hi",
    script: "Devanagari",
    sha256: "ed051654ba60e4008628446f793a30a2a49161974f525ea6bb1abdbee61a6baf",
  },
  {
    order: 20,
    catalogNumber: "AU/II-020",
    id: "correspondence-020",
    slug: "poem-020",
    title: "मोहब्बत की पहचान",
    language: "hi",
    script: "Devanagari",
    sha256: "501aefcad206c79db858c3bb5ea02f7055cb9e84d0327ed7c601c0253720491e",
  },
  {
    order: 21,
    catalogNumber: "AU/II-021",
    id: "correspondence-021",
    slug: "poem-021",
    title: "तेरा नूर",
    language: "hi",
    script: "Devanagari",
    sha256: "cdd91fe7722f99ea4d55c9808024eff8781dafeb5284c21c702be73f2db3d5a9",
  },
  {
    order: 22,
    catalogNumber: "AU/II-022",
    id: "correspondence-022",
    slug: "poem-022",
    title: "Saudade",
    language: "en",
    script: "Latin",
    sha256: "24d9f1dee24374f649b31932a5e042af6b616ca77df0a01ca2aa94650179603c",
  },
  {
    order: 23,
    catalogNumber: "AU/II-023",
    id: "correspondence-023",
    slug: "poem-023",
    title: "Izel",
    language: "en",
    script: "Latin",
    sha256: "617a7b545294c1278c4d6396499a77a49950f88def47b2ec09da595c5fc6ee4e",
  },
];

describe("Correspondence first-edition 23-poem collection integrity & SHA-256 verification", () => {
  it("contains exactly 23 unique artefacts with exact catalogue numbers, titles, order, and UTF-8 SHA-256 hashes", () => {
    assert.equal(CORRESPONDENCE_ARTIFACTS.length, 23);

    const integrity = validateCollectionIntegrity(CORRESPONDENCE_ARTIFACTS);
    assert.equal(integrity.valid, true, integrity.errors.join("; "));

    // Verify no duplicate of existing AU/II-001
    const legacyMatches = CORRESPONDENCE_ARTIFACTS.filter(
      (item) => item.slug === "for-you-poem" || item.catalogNumber === "AU/II-001"
    );
    assert.equal(legacyMatches.length, 1);

    for (let i = 0; i < EXPECTED_FIRST_EDITION.length; i++) {
      const expected = EXPECTED_FIRST_EDITION[i];
      const actual = CORRESPONDENCE_ARTIFACTS[i];

      assert.equal(actual.collectionOrder, expected.order);
      assert.equal(actual.catalogNumber, expected.catalogNumber);
      assert.equal(actual.id, expected.id);
      assert.equal(actual.slug, expected.slug);
      assert.equal(actual.title, expected.title);
      assert.equal(actual.language, expected.language);
      assert.equal(actual.script, expected.script);
      assert.equal(actual.originalTextSha256, expected.sha256);

      // Exact UTF-8 SHA-256 without normalization or line-ending mutation
      const computedSha = createHash("sha256")
        .update(Buffer.from(actual.originalText, "utf8"))
        .digest("hex");
      assert.equal(
        computedSha,
        expected.sha256,
        `UTF-8 SHA-256 mismatch on ${expected.catalogNumber}`
      );

      // All 23 first-edition artefacts are explicitly approved by the author
      assert.equal(actual.publishStatus, "ready");
      assert.equal(actual.consentConfirmed, true);
      assert.equal(isArtefactApproved(actual), true);
    }
  });

  it("preserves ORIGINAL_FOR_YOU_POEM_TEXT byte-for-byte (475 chars, 1175 UTF-8 bytes) and AU/II-004 continuous final line", () => {
    const utf8 = Buffer.from(ORIGINAL_FOR_YOU_POEM_TEXT, "utf8");
    const sha256 = createHash("sha256").update(utf8).digest("hex");

    assert.equal(ORIGINAL_FOR_YOU_POEM_TEXT.length, 475);
    assert.equal(utf8.length, 1175);
    assert.equal(sha256, EXPECTED_FIRST_EDITION[0].sha256);
    assert.equal(CORRESPONDENCE_ARTIFACTS[0].originalText, ORIGINAL_FOR_YOU_POEM_TEXT);

    // Special lineation rule: एहतिसाब (AU/II-004) final sentence stays one continuous poetic line
    const ehtisaab = CORRESPONDENCE_ARTIFACTS.find(
      (item) => item.catalogNumber === "AU/II-004"
    );
    assert.ok(ehtisaab);
    const lines = ehtisaab.originalText.split("\n");
    assert.equal(
      lines[lines.length - 1],
      "ख़ता तो मिट्टी की फ़ितरत है, फ़रिश्ता कौन है यहाँ, मानकर सुधर जाना ही असली सवाब है।"
    );
  });

  it("resolves all 23 live production routes, typography classes, and full Previous/Next chain", () => {
    const approved = selectApprovedCorrespondenceArtefacts(
      CORRESPONDENCE_ARTIFACTS
    );
    assert.equal(approved.length, 23);

    for (let i = 0; i < approved.length; i++) {
      const entry = approved[i];
      const resolved = findApprovedArtefactBySlug(CORRESPONDENCE_ARTIFACTS, entry.slug);
      assert.ok(resolved);
      assert.equal(resolved.originalText, CORRESPONDENCE_ARTIFACTS[i].originalText);

      // Typography check: AU/II-001..021 Hindi Devanagari, AU/II-022..023 English Latin
      const expectedClass =
        entry.script === "Devanagari"
          ? "correspondence-verse-devanagari"
          : "correspondence-verse-latin";
      assert.equal(getReadingTextClass(entry.script, entry.language), expectedClass);

      // Previous/Next chain in exact collection order (1 through 23)
      const nav = resolveReaderNavigation(approved, entry.slug);
      assert.equal(nav.position, i + 1);
      assert.equal(nav.total, 23);
      assert.equal(
        nav.previous?.catalogNumber ?? null,
        i > 0 ? approved[i - 1].catalogNumber : null
      );
      assert.equal(
        nav.next?.catalogNumber ?? null,
        i < approved.length - 1 ? approved[i + 1].catalogNumber : null
      );
    }
  });

  it("enforces withheld filtering on withheld records and never renders placeholder Untitled labels", () => {
    const withWithheldRecord: CorrespondenceArtefact[] = [
      ...CORRESPONDENCE_ARTIFACTS,
      {
        id: "correspondence-999-withheld",
        slug: "withheld-sentinel-999",
        catalogNumber: "AU/II-999",
        collectionOrder: 999,
        type: "poem",
        title: "Withheld Sentinel",
        language: "en",
        script: "Latin",
        publishStatus: "withheld",
        consentConfirmed: false,
        originalText: "Withheld sentinel text",
      },
    ];
    const approved = selectApprovedCorrespondenceArtefacts(withWithheldRecord);
    assert.equal(approved.length, 23);
    assert.equal(
      findApprovedArtefactBySlug(withWithheldRecord, "withheld-sentinel-999"),
      null
    );

    // Verify Correspondence UI components omit visible catalogue taxonomy & placeholder labels
    const catalogueSource = readFileSync(
      "components/correspondence/CorrespondenceCatalogue.tsx",
      "utf8"
    );
    const readerSource = readFileSync(
      "components/correspondence/CorrespondenceReader.tsx",
      "utf8"
    );
    assert.equal(catalogueSource.includes("Untitled"), false);
    assert.equal(readerSource.includes("Untitled"), false);
    assert.equal(catalogueSource.includes("catalogNumber"), false);
    assert.equal(readerSource.includes("catalogNumber"), false);
    assert.equal(catalogueSource.includes("II · AU/II"), false);
    assert.equal(readerSource.includes("formatLanguageMetadata"), false);
    assert.equal(readerSource.includes("formatArtefactTypeLabel"), false);
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

    const types = new Set(approved.map((item) => item.type));
    assert.ok(types.has("poem"));
    assert.ok(types.has("letter"));
    assert.ok(types.has("fragment"));
    assert.ok(types.has("other"));

    const scripts = new Set(approved.map((item) => item.script));
    assert.ok(scripts.has("Devanagari"));
    assert.ok(scripts.has("Latin"));
    assert.ok(scripts.has("Mixed"));

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
        const order = 55 - idx;
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

describe("Correspondence withheld filtering, typography, and Previous/Next navigation", () => {
  it("skips withheld artefacts cleanly in Previous/Next and returns null for direct withheld slug lookup", () => {
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

    const nav3 = resolveReaderNavigation(
      approved,
      "synthetic-untitled-fragment-03"
    );
    assert.equal(nav3.previous?.catalogNumber, "TEST/II-002");
    assert.equal(nav3.next?.catalogNumber, "TEST/II-005");
    assert.equal(nav3.next?.slug, "synthetic-long-english-poem-05");

    const nav5 = resolveReaderNavigation(
      approved,
      "synthetic-long-english-poem-05"
    );
    assert.equal(nav5.previous?.catalogNumber, "TEST/II-003");
    assert.equal(nav5.previous?.slug, "synthetic-untitled-fragment-03");

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
      getReadingTextClass("Devanagari", "Hindi"),
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
    assert.equal(formatLanguageMetadata("Hindi", "Devanagari"), "Hindi · Devanagari");
    assert.equal(formatLanguageMetadata("ur", "Nastaliq"), "Urdu · Nastaliq");
  });

  it("detects deliberate mobile horizontal swipes without wrapping or interfering with vertical scroll", () => {
    // Swipe left -> next when available; never wraps at end
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 280,
        startY: 300,
        endX: 170,
        endY: 312,
        durationMs: 220,
        hasPrevious: true,
        hasNext: true,
      }),
      "next"
    );
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 280,
        startY: 300,
        endX: 170,
        endY: 312,
        durationMs: 220,
        hasPrevious: true,
        hasNext: false,
      }),
      "none"
    );

    // Swipe right -> prev when available; never wraps at beginning
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 90,
        startY: 320,
        endX: 205,
        endY: 310,
        durationMs: 240,
        hasPrevious: true,
        hasNext: true,
      }),
      "prev"
    );
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 90,
        startY: 320,
        endX: 205,
        endY: 310,
        durationMs: 240,
        hasPrevious: false,
        hasNext: true,
      }),
      "none"
    );

    // Vertical scroll, diagonal drag, below-threshold nudge, and slow selection drag are ignored
    assert.equal(shouldCancelSwipeForVerticalScroll(12, -36), true);
    assert.equal(shouldCancelSwipeForVerticalScroll(48, 12), false);
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 200,
        startY: 400,
        endX: 110,
        endY: 280,
        durationMs: 200,
        hasPrevious: true,
        hasNext: true,
      }),
      "none"
    );
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 200,
        startY: 300,
        endX: 155,
        endY: 302,
        durationMs: 180,
        hasPrevious: true,
        hasNext: true,
      }),
      "none"
    );
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 280,
        startY: 300,
        endX: 150,
        endY: 305,
        durationMs: 950,
        hasPrevious: true,
        hasNext: true,
      }),
      "none"
    );
    assert.equal(
      detectCorrespondenceSwipe({
        startX: 280,
        startY: 300,
        endX: 150,
        endY: 305,
        durationMs: 210,
        hasPrevious: true,
        hasNext: true,
        cancelledByVertical: true,
      }),
      "none"
    );
  });

  it("defines warm literary paper tokens, Devanagari shaping rules, smooth transition, and reduced-motion in globals.css", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.ok(css.includes("--room-correspondence: #ede6d9;"));
    assert.ok(css.includes("--room-correspondence-surface: #e5dccb;"));
    assert.ok(css.includes("--room-correspondence-elevated: #f3eee5;"));
    assert.ok(css.includes("--ink-paper-primary: #29251f;"));
    assert.ok(css.includes("--hairline-paper: #cec4b4;"));
    assert.ok(css.includes(".correspondence-ground-enter"));
    assert.ok(css.includes("correspondenceLightBloom"));
    assert.ok(css.includes("1350ms"));
    assert.ok(css.includes(".correspondence-verse-devanagari"));
    assert.ok(css.includes("letter-spacing: 0;"));
    assert.ok(css.includes("white-space: pre-wrap;"));
  });
});
