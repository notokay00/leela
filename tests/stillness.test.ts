import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";
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
  computeFlashlightRadius,
  computeFlashlightSpotlight,
  computePrintTilt,
  computeTableLightPosition,
  detectViewerSwipe,
  MAX_FLASHLIGHT_RADIUS_PX,
  MAX_PRINT_TILT_DEG,
  MIN_FLASHLIGHT_RADIUS_PX,
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

  it("never stretches a sparse final row and balances its height against completed rows above", () => {
    const singleTail = [{ id: "solo-portrait", width: 600, height: 900 }];
    const soloRows = computeJustifiedRows(singleTail, {
      containerWidth: 920,
      targetRowHeight: 215,
      gap: 22,
    });

    assert.equal(soloRows.length, 1);
    assert.equal(soloRows[0].isComplete, false);
    assert.equal(soloRows[0].height, 215);
    assert.ok(soloRows[0].items[0].width < 200);

    // Multi-row layout: incomplete final row must never loom taller than completed rows above
    const multiRows = computeJustifiedRows(mixedPhotos, {
      containerWidth: 920,
      targetRowHeight: 215,
      gap: 22,
    });
    const completed = multiRows.filter((r) => r.isComplete);
    const tail = multiRows[multiRows.length - 1];
    if (completed.length > 0 && !tail.isComplete) {
      const avgCompleted =
        completed.reduce((s, r) => s + r.height, 0) / completed.length;
      assert.ok(tail.height <= avgCompleted + 0.01);
    }
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

  it("computes bounded flashlight coordinates and shorter-dimension circular radii", () => {
    // Shorter-dimension scaling preserves circular character on wide panoramic images
    // TEST/04-like panoramic (365x137) and TEST/01-like landscape (205x137) share the same height -> same circular radius (62px)
    const landscapeRadius = computeFlashlightRadius(205, 137);
    const panoramicRadius = computeFlashlightRadius(365, 137);
    assert.equal(landscapeRadius, 62);
    assert.equal(panoramicRadius, 62);
    assert.ok(panoramicRadius < 137 / 2);

    // Narrow portrait (91x137) clamps cleanly at MIN_FLASHLIGHT_RADIUS_PX (55px)
    const narrowPortraitRadius = computeFlashlightRadius(91, 137);
    assert.equal(narrowPortraitRadius, MIN_FLASHLIGHT_RADIUS_PX);

    // Larger prints scale up smoothly and cap at MAX_FLASHLIGHT_RADIUS_PX (115px)
    const largeLandscapeRadius = computeFlashlightRadius(320, 214);
    assert.equal(largeLandscapeRadius, 96);
    assert.equal(computeFlashlightRadius(600, 400), MAX_FLASHLIGHT_RADIUS_PX);

    const imageRect = { left: 120, top: 80, width: 320, height: 214 };

    // Pointer at centre
    const center = computeFlashlightSpotlight(280, 187, imageRect, {
      finePointer: true,
    });
    assert.equal(center.x, 160);
    assert.equal(center.y, 107);
    assert.equal(center.radius, largeLandscapeRadius);
    assert.equal(center.active, true);

    // Pointer at exact top-left edge stays active and bounded at (0, 0)
    const edge = computeFlashlightSpotlight(120, 80, imageRect, {
      finePointer: true,
    });
    assert.deepEqual(edge, {
      x: 0,
      y: 0,
      radius: largeLandscapeRadius,
      active: true,
    });

    // Pointer outside the visible image clamps coordinates and marks inactive
    const outside = computeFlashlightSpotlight(600, 400, imageRect, {
      finePointer: true,
    });
    assert.equal(outside.x, 320);
    assert.equal(outside.y, 214);
    assert.equal(outside.active, false);

    // Coarse / touch pointer never activates hover spotlight
    const touch = computeFlashlightSpotlight(280, 187, imageRect, {
      finePointer: false,
    });
    assert.equal(touch.active, false);
  });
});

describe("Stillness consent enforcement, privacy, and synthetic fixture isolation", () => {
  it("catalogues all 15 Stillness photographs with verified post-rotation dimensions while keeping unconsented photos strictly withheld", () => {
    assert.equal(STILLNESS_PHOTOS.length, 15);

    // Every production Stillness photograph remains withheld until subject consent is established
    const approvedProduction = selectApprovedStillnessPhotos(
      STILLNESS_PHOTOS,
      (key) => {
        const asset = resolveApprovedMediaAsset(key);
        return (
          asset !== null &&
          asset.assetCategory === "personal-media" &&
          asset.consentConfirmed === true
        );
      }
    );
    assert.equal(approvedProduction.length, 0);

    // Verify orientation-corrected dimensions (02, 04, 05, 14 -> 1920x1080; 12 -> 1599x899; 07 preserved -> 1290x2796)
    const byId = new Map(STILLNESS_PHOTOS.map((p) => [p.id, p]));
    for (const rotated1080 of [
      "stillness-02",
      "stillness-04",
      "stillness-05",
      "stillness-14",
    ]) {
      assert.equal(byId.get(rotated1080)?.width, 1920);
      assert.equal(byId.get(rotated1080)?.height, 1080);
    }
    assert.equal(byId.get("stillness-12")?.width, 1599);
    assert.equal(byId.get("stillness-12")?.height, 899);
    assert.equal(byId.get("stillness-07")?.width, 1290);
    assert.equal(byId.get("stillness-07")?.height, 2796);

    let hasPortrait = false;
    let hasLandscape = false;
    for (let i = 0; i < STILLNESS_PHOTOS.length; i++) {
      const padded = String(i + 1).padStart(2, "0");
      const meta = STILLNESS_PHOTOS[i];

      assert.equal(meta.id, `stillness-${padded}`);
      assert.equal(meta.catalogId, `AU/I-${padded}`);
      assert.equal(meta.assetKey, `arc-i-${padded}`);
      assert.equal(meta.publishStatus, "withheld");
      assert.equal(meta.consentConfirmed, false);
      assert.equal(meta.caption, undefined);
      assert.equal(meta.capturedAt, undefined);
      assert.ok(meta.width > 0 && meta.height > 0);
      if (meta.height > meta.width) hasPortrait = true;
      if (meta.width > meta.height) hasLandscape = true;
    }
    assert.equal(hasPortrait, true);
    assert.equal(hasLandscape, true);

    // Negative consent & allowlist gating must block withheld, unconsented, unallowlisted, and music-category assets
    const mixedConsent: StillnessPhotoMetadata[] = [
      {
        id: "withheld-1",
        catalogId: "AU/I-91",
        assetKey: "arc-i-01",
        width: 800,
        height: 600,
        altText: "Withheld test metadata",
        publishStatus: "withheld",
        consentConfirmed: false,
      },
      {
        id: "ready-no-consent",
        catalogId: "AU/I-92",
        assetKey: "arc-i-02",
        width: 800,
        height: 600,
        altText: "Unconsented test metadata",
        publishStatus: "ready",
        consentConfirmed: false,
      },
      {
        id: "ready-unallowlisted",
        catalogId: "AU/I-93",
        assetKey: "arc-i-99",
        width: 800,
        height: 600,
        altText: "Not in media registry allowlist",
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "music-category-rejected",
        catalogId: "AU/I-94",
        assetKey: "arc-score-aranjuez",
        width: 800,
        height: 600,
        altText: "Music asset must never resolve as personal photograph",
        publishStatus: "ready",
        consentConfirmed: true,
      },
    ];

    const approvedMixed = selectApprovedStillnessPhotos(
      mixedConsent,
      (key) => {
        const asset = resolveApprovedMediaAsset(key);
        return (
          asset !== null &&
          asset.assetCategory === "personal-media" &&
          asset.consentConfirmed === true
        );
      }
    );
    assert.equal(approvedMixed.length, 0);

    // Explicitly approved mock record resolves cleanly to /api/media/<opaque-id>
    const mockApproved = selectApprovedStillnessPhotos(
      [
        {
          ...STILLNESS_PHOTOS[0],
          publishStatus: "ready",
          consentConfirmed: true,
        },
      ],
      (key) => key === "arc-i-01"
    );
    assert.equal(mockApproved.length, 1);
    assert.equal(mockApproved[0].src, "/api/media/arc-i-01");

    // Ensure synthetic fixtures are NEVER present in the production media allowlist
    for (const fixture of SYNTHETIC_STILLNESS_FIXTURES) {
      assert.equal(resolveApprovedMediaAsset(fixture.id), null);
    }

    // Viewer renders zero-padded 01 / 15 counter, Escape/Arrow navigation, and zero slideshow timers
    const viewerSrc = readFileSync("components/stillness/StillnessViewer.tsx", "utf8");
    assert.ok(viewerSrc.includes('padStart(2, "0")'));
    assert.ok(viewerSrc.includes('"Escape"'));
    assert.ok(viewerSrc.includes('"ArrowLeft"'));
    assert.ok(viewerSrc.includes('"ArrowRight"'));
    assert.equal(viewerSrc.includes("setInterval"), false);
  });

  it("generates colourful synthetic PNG calibration plates covering portrait, landscape, square, and panoramic", () => {
    const ratios = SYNTHETIC_STILLNESS_FIXTURES.map((f) => f.width / f.height);
    assert.ok(ratios.some((r) => r < 0.8), "Must include portrait");
    assert.ok(ratios.some((r) => r > 1.3 && r < 2.0), "Must include landscape");
    assert.ok(ratios.some((r) => r === 1), "Must include square");
    assert.ok(ratios.some((r) => r >= 2.5), "Must include panoramic");

    for (const fixture of SYNTHETIC_STILLNESS_FIXTURES) {
      const png = renderSyntheticFixturePng(fixture);
      // Valid PNG magic header bytes
      assert.deepEqual(
        [...png.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10]
      );

      // Extract IDAT chunk and verify vivid chromatic diversity (not monochrome grey)
      const w = png.readUInt32BE(16);
      const h = png.readUInt32BE(20);
      let offset = 8;
      let idatPayload: Buffer | null = null;
      while (offset < png.length) {
        const len = png.readUInt32BE(offset);
        const type = png.subarray(offset + 4, offset + 8).toString("ascii");
        if (type === "IDAT") {
          idatPayload = png.subarray(offset + 8, offset + 8 + len);
          break;
        }
        offset += 12 + len;
      }
      assert.ok(idatPayload !== null, `Missing IDAT chunk for ${fixture.id}`);
      const raw = inflateSync(idatPayload);
      const stride = 1 + w * 3;
      let colorfulPixels = 0;
      let sampled = 0;
      for (let y = 12; y < h - 12; y += 6) {
        for (let x = 12; x < w - 12; x += 6) {
          const px = y * stride + 1 + x * 3;
          const r = raw[px];
          const g = raw[px + 1];
          const b = raw[px + 2];
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          if (chroma >= 45) {
            colorfulPixels++;
          }
          sampled++;
        }
      }
      assert.ok(
        colorfulPixels / Math.max(1, sampled) > 0.5,
        `Fixture ${fixture.id} must be genuinely colourful (found ${colorfulPixels}/${sampled})`
      );
    }
  });

  it("includes dual-layer flashlight CSS mask rules, focus reveal, and reduced-motion overrides in globals.css", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.ok(css.includes(".light-table-plane"));
    assert.ok(css.includes(".light-table-print-base"));
    assert.ok(css.includes(".light-table-print-lit"));
    assert.ok(css.includes("-webkit-mask-image:"));
    assert.ok(css.includes("mask-image:"));
    assert.ok(css.includes("radial-gradient("));
    assert.ok(css.includes("--spot-radius"));
    assert.ok(css.includes("--spot-x"));
    assert.ok(css.includes("--spot-y"));
    assert.ok(css.includes(".light-table-print:focus-visible:not(:hover)"));
    assert.ok(css.includes(".viewer-scroll-lock"));
    // No white overlay sheen washing out original colours
    assert.ok(!css.includes(".light-table-print-sheen"));
  });
});
