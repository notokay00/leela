import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  selectApprovedStillnessPhotos,
  STILLNESS_PHOTOS,
  type StillnessPhotoMetadata,
} from "../content/artifacts/stillness.ts";
import { resolveApprovedMediaAsset } from "../lib/media/registry.ts";
import {
  groupPhotosChronologically,
  parseGenuineCaptureDate,
} from "../lib/stillness/chronology.ts";
import { computeJustifiedRows } from "../lib/stillness/layout.ts";
import {
  computePrintTilt,
  computeTableLightPosition,
  detectViewerSwipe,
  MAX_PRINT_TILT_DEG,
} from "../lib/stillness/light-table.ts";
import {
  renderSyntheticFixturePng,
  SYNTHETIC_STILLNESS_FIXTURES,
} from "../lib/stillness/synthetic-fixtures.ts";

describe("Stillness justified contact-sheet layout engine", () => {
  const mixedPhotos = [
    { id: "p1", width: 900, height: 600 }, // 3:2 landscape
    { id: "p2", width: 600, height: 900 }, // 2:3 portrait
    { id: "p3", width: 720, height: 720 }, // 1:1 square
    { id: "p4", width: 1200, height: 450 }, // 8:3 panoramic
    { id: "p5", width: 560, height: 840 }, // 2:3 portrait
    { id: "p6", width: 960, height: 540 }, // 16:9 landscape
    { id: "p7", width: 680, height: 680 }, // 1:1 square (sparse tail)
  ];

  it("preserves exact source order, intrinsic ratios, and equal heights per completed row", () => {
    const gap = 18;
    const containerWidth = 1000;
    const rows = computeJustifiedRows(mixedPhotos, {
      containerWidth,
      targetRowHeight: 240,
      gap,
    });

    assert.ok(rows.length >= 2);

    // Source order strictly preserved (no masonry reordering)
    const flattenedIds = rows.flatMap((row) => row.items.map((item) => item.photo.id));
    assert.deepEqual(
      flattenedIds,
      mixedPhotos.map((p) => p.id)
    );

    for (const row of rows) {
      const totalWidth =
        row.items.reduce((sum, item) => sum + item.width, 0) +
        gap * (row.items.length - 1);

      // Never overflows container width
      assert.ok(totalWidth <= containerWidth + 0.5);

      for (const item of row.items) {
        // Equal row height for every item in the row
        assert.equal(item.height, row.height);

        // Intrinsic aspect ratio preserved (zero cropping)
        const renderedRatio = item.width / item.height;
        const intrinsicRatio = item.photo.width / item.photo.height;
        assert.ok(Math.abs(renderedRatio - intrinsicRatio) < 0.02);
      }

      if (row.isComplete) {
        assert.ok(Math.abs(totalWidth - containerWidth) <= 0.5);
      }
    }
  });

  it("never stretches a sparse final row across the full container width", () => {
    const singleTail = [{ id: "solo-portrait", width: 600, height: 900 }];
    const rows = computeJustifiedRows(singleTail, {
      containerWidth: 1000,
      targetRowHeight: 240,
      gap: 18,
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].isComplete, false);
    assert.equal(rows[0].height, 240);
    assert.equal(rows[0].items[0].width, 160);
    assert.ok(rows[0].items[0].width < 300);
  });

  it("handles narrow mobile widths (360px and 390px) cleanly without horizontal overflow", () => {
    for (const width of [360, 390]) {
      const gap = 12;
      const rows = computeJustifiedRows(mixedPhotos, {
        containerWidth: width - 32,
        gap,
      });

      assert.ok(rows.length > 0);
      for (const row of rows) {
        const rowWidth =
          row.items.reduce((sum, item) => sum + item.width, 0) +
          gap * (row.items.length - 1);
        assert.ok(
          rowWidth <= width - 32 + 0.5,
          `Row overflowed at ${width}px: ${rowWidth}`
        );
      }
    }
  });
});

describe("Stillness Chronology grouping engine", () => {
  it("groups genuine recorded dates by year and month, preserves equal-date order, and puts undated items last", () => {
    const items = [
      { id: "u1" },
      { id: "d-jun-b", capturedAt: "2024-06-08" },
      { id: "d-mar", capturedAt: "2024-03-14" },
      { id: "u2", capturedAt: "not-a-date" },
      { id: "d-jun-a", capturedAt: "2024-06-08" },
      { id: "d-jun-late", capturedAt: "2024-06-19" },
    ];

    const groups = groupPhotosChronologically(items);
    assert.deepEqual(
      groups.map((g) => [g.key, g.label, g.isUndated]),
      [
        ["2024-03", "March 2024", false],
        ["2024-06", "June 2024", false],
        ["UNDATED", "UNDATED", true],
      ]
    );

    // Equal-date items preserve original source ordering (d-jun-b before d-jun-a)
    assert.deepEqual(
      groups[1].items.map((entry) => entry.photo.id),
      ["d-jun-b", "d-jun-a", "d-jun-late"]
    );

    // Undated group preserves original source ordering
    assert.deepEqual(
      groups[2].items.map((entry) => entry.photo.id),
      ["u1", "u2"]
    );
  });

  it("rejects impossible calendar dates instead of inventing dates", () => {
    assert.equal(parseGenuineCaptureDate("2024-02-31"), null);
    assert.equal(parseGenuineCaptureDate("2024-13-01"), null);
    assert.equal(parseGenuineCaptureDate(undefined), null);
    assert.ok(parseGenuineCaptureDate("2024-02-29") !== null);
  });
});

describe("The Living Light Table 2.5D physics, bounds, and viewer swipe gestures", () => {
  it("keeps pointer light coordinates strictly bounded to the table surface", () => {
    const rect = { left: 100, top: 200, width: 800, height: 500 };

    const inside = computeTableLightPosition(300, 350, rect);
    assert.deepEqual(inside, { x: 200, y: 150, inside: true });

    const outsideNeg = computeTableLightPosition(20, 50, rect);
    assert.deepEqual(outsideNeg, { x: 0, y: 0, inside: false });

    const outsidePos = computeTableLightPosition(1500, 1200, rect);
    assert.deepEqual(outsidePos, { x: 800, y: 500, inside: false });
  });

  it("enforces restrained tilt bounds and zeroes tilt for reduced-motion or touch devices", () => {
    const rect = { left: 0, top: 0, width: 200, height: 300 };

    // Center -> 0 tilt
    assert.deepEqual(
      computePrintTilt(100, 150, rect, { finePointer: true, reducedMotion: false }),
      { rotateX: 0, rotateY: 0 }
    );

    // Far corner -> clamped strictly to +-MAX_PRINT_TILT_DEG
    const corner = computePrintTilt(500, -100, rect, {
      finePointer: true,
      reducedMotion: false,
    });
    assert.equal(corner.rotateY, MAX_PRINT_TILT_DEG);
    assert.equal(corner.rotateX, MAX_PRINT_TILT_DEG);
    assert.ok(Math.abs(corner.rotateX) <= 3.5);
    assert.ok(Math.abs(corner.rotateY) <= 3.5);

    // Reduced motion -> strictly zero
    assert.deepEqual(
      computePrintTilt(200, 0, rect, { finePointer: true, reducedMotion: true }),
      { rotateX: 0, rotateY: 0 }
    );

    // Coarse / touch pointer -> strictly zero
    assert.deepEqual(
      computePrintTilt(200, 0, rect, { finePointer: false, reducedMotion: false }),
      { rotateX: 0, rotateY: 0 }
    );
  });

  it("recognizes viewer left/right/down touch swipes cleanly", () => {
    assert.equal(detectViewerSwipe(-80, 10), "next");
    assert.equal(detectViewerSwipe(80, -10), "prev");
    assert.equal(detectViewerSwipe(12, 95), "close");
    assert.equal(detectViewerSwipe(15, 10), "none");
  });
});

describe("Stillness consent enforcement, privacy, and synthetic fixture isolation", () => {
  it("keeps production Stillness completely empty and excludes withheld/unconsented/unallowlisted assets", () => {
    assert.equal(STILLNESS_PHOTOS.length, 0);

    const mixedConsent: StillnessPhotoMetadata[] = [
      {
        id: "withheld-1",
        catalogId: "AU/I-01",
        assetKey: "arc-i-01",
        width: 800,
        height: 600,
        altText: "Withheld test metadata",
        publishStatus: "withheld",
        consentConfirmed: false,
      },
      {
        id: "ready-no-consent",
        catalogId: "AU/I-02",
        assetKey: "arc-i-02",
        width: 800,
        height: 600,
        altText: "Unconsented test metadata",
        publishStatus: "ready",
        consentConfirmed: false,
      },
      {
        id: "ready-unallowlisted",
        catalogId: "AU/I-03",
        assetKey: "arc-i-03",
        width: 800,
        height: 600,
        altText: "Not in media registry allowlist",
        publishStatus: "ready",
        consentConfirmed: true,
      },
    ];

    const approved = selectApprovedStillnessPhotos(
      mixedConsent,
      (key) => resolveApprovedMediaAsset(key) !== null
    );
    assert.equal(approved.length, 0);

    // Ensure synthetic fixtures are NEVER present in the production media allowlist
    for (const fixture of SYNTHETIC_STILLNESS_FIXTURES) {
      assert.equal(resolveApprovedMediaAsset(fixture.id), null);
    }
  });

  it("generates valid synthetic PNG calibration plates covering portrait, landscape, square, and panoramic", () => {
    const ratios = SYNTHETIC_STILLNESS_FIXTURES.map((f) => f.width / f.height);
    assert.ok(ratios.some((r) => r < 0.8), "Must include portrait");
    assert.ok(ratios.some((r) => r > 1.3 && r < 2.0), "Must include landscape");
    assert.ok(ratios.some((r) => r === 1), "Must include square");
    assert.ok(ratios.some((r) => r >= 2.5), "Must include panoramic");

    const samplePng = renderSyntheticFixturePng(SYNTHETIC_STILLNESS_FIXTURES[0]);
    // Valid PNG magic header bytes
    assert.deepEqual(
      [...samplePng.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10]
    );
  });

  it("includes reduced-motion overrides for the Living Light Table in globals.css", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.ok(css.includes(".light-table-plane"));
    assert.ok(css.includes(".light-table-print"));
    assert.ok(css.includes(".light-table-glow"));
    assert.ok(css.includes(".viewer-scroll-lock"));
  });
});
