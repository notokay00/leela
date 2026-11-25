import "server-only";
import { deflateSync } from "node:zlib";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";

/**
 * DEVELOPMENT / TEST-ONLY synthetic colour calibration plates.
 *
 * - Never registered in `lib/media/registry.ts` or `content/artifacts/stillness.ts`.
 * - Strictly blocked in production (`NODE_ENV !== "development"` returns 404).
 * - Uses clearly synthetic, multi-region colourful calibration patterns across
 *   portrait, landscape, square, and panoramic dimensions so the dimmed base
 *   layer and localized flashlight colour reveal can be inspected accurately.
 */
export type CalibrationPattern =
  | "quadrants"
  | "vertical-bands"
  | "concentric-blocks"
  | "spectral-panorama"
  | "split-grid"
  | "horizon-chart"
  | "colour-checker";

export type RgbColor = readonly [number, number, number];

export interface SyntheticStillnessFixture extends StillnessClientPhoto {
  pattern: CalibrationPattern;
  swatches: readonly RgbColor[];
}

export const SYNTHETIC_STILLNESS_FIXTURES: readonly SyntheticStillnessFixture[] = [
  {
    id: "fixture-landscape-01",
    catalogId: "TEST 01",
    src: "/api/dev/stillness-fixture/fixture-landscape-01",
    width: 900,
    height: 600,
    capturedAt: "2024-03-14",
    caption: "Synthetic landscape colour calibration plate (3:2).",
    altText:
      "Synthetic four-quadrant colour calibration plate in terracotta, ochre, cobalt, and emerald, landscape orientation",
    pattern: "quadrants",
    swatches: [
      [196, 68, 52], // terracotta vermilion
      [218, 162, 54], // warm ochre gold
      [42, 102, 178], // deep cobalt blue
      [44, 142, 108], // pine emerald
    ],
  },
  {
    id: "fixture-portrait-02",
    catalogId: "TEST 02",
    src: "/api/dev/stillness-fixture/fixture-portrait-02",
    width: 600,
    height: 900,
    capturedAt: "2024-03-21",
    altText:
      "Synthetic vertical colour-band calibration plate in crimson, saffron, and teal, portrait orientation",
    pattern: "vertical-bands",
    swatches: [
      [178, 52, 74], // deep crimson rose
      [226, 152, 48], // saffron amber
      [34, 128, 138], // prussian teal
      [58, 72, 136], // slate indigo
    ],
  },
  {
    id: "fixture-square-03",
    catalogId: "TEST 03",
    src: "/api/dev/stillness-fixture/fixture-square-03",
    width: 720,
    height: 720,
    capturedAt: "2024-06-08",
    caption: "Synthetic square optical target calibration plate (1:1).",
    altText:
      "Synthetic square optical colour target with sienna, viridian, ultramarine, and gold blocks",
    pattern: "concentric-blocks",
    swatches: [
      [188, 84, 46], // burnt sienna
      [56, 148, 92], // viridian green
      [52, 92, 172], // ultramarine
      [214, 174, 62], // goldenrod
    ],
  },
  {
    id: "fixture-panoramic-04",
    catalogId: "TEST 04",
    src: "/api/dev/stillness-fixture/fixture-panoramic-04",
    width: 1200,
    height: 450,
    capturedAt: "2024-06-19",
    caption: "Synthetic panoramic spectral colour-step plate (8:3).",
    altText:
      "Synthetic panoramic six-band spectral colour calibration plate spanning crimson, amber, emerald, cyan, indigo, and plum",
    pattern: "spectral-panorama",
    swatches: [
      [194, 58, 62], // crimson
      [224, 146, 44], // amber
      [54, 152, 94], // moss emerald
      [38, 146, 162], // cyan teal
      [62, 84, 168], // indigo
      [152, 68, 142], // plum magenta
    ],
  },
  {
    id: "fixture-portrait-05",
    catalogId: "TEST 05",
    src: "/api/dev/stillness-fixture/fixture-portrait-05",
    width: 560,
    height: 840,
    altText:
      "Synthetic undated portrait calibration plate with warm and cool colour tiles",
    pattern: "split-grid",
    swatches: [
      [208, 118, 52], // burnt orange
      [48, 116, 164], // steel cerulean
      [164, 58, 96], // berry magenta
      [78, 154, 108], // sage green
      [218, 184, 82], // warm maize
      [74, 68, 134], // twilight violet
    ],
  },
  {
    id: "fixture-landscape-06",
    catalogId: "TEST 06",
    src: "/api/dev/stillness-fixture/fixture-landscape-06",
    width: 960,
    height: 540,
    altText:
      "Synthetic undated wide landscape horizon calibration chart with violet, coral, gold, and turquoise bands",
    pattern: "horizon-chart",
    swatches: [
      [112, 62, 146], // deep violet
      [212, 92, 74], // coral red
      [230, 174, 68], // sunlit gold
      [34, 134, 132], // deep turquoise
    ],
  },
  {
    id: "fixture-square-07",
    catalogId: "TEST 07",
    src: "/api/dev/stillness-fixture/fixture-square-07",
    width: 680,
    height: 680,
    capturedAt: "2024-06-08",
    altText:
      "Synthetic dated square 3x3 darkroom colour-checker calibration chart",
    pattern: "colour-checker",
    swatches: [
      [186, 66, 56], // terracotta
      [224, 158, 52], // marigold
      [74, 148, 98], // sage
      [48, 106, 174], // cerulean
      [134, 72, 156], // violet
      [214, 102, 84], // coral
      [38, 142, 148], // teal
      [196, 142, 68], // ochre
      [214, 206, 188], // warm ivory
    ],
  },
];

// Minimal zero-dependency PNG encoder for synthetic darkroom test plates.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendColor(
  a: RgbColor,
  b: RgbColor,
  t: number
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    clampByte(a[0] + (b[0] - a[0]) * u),
    clampByte(a[1] + (b[1] - a[1]) * u),
    clampByte(a[2] + (b[2] - a[2]) * u),
  ];
}

function samplePatternPixel(
  fixture: SyntheticStillnessFixture,
  x: number,
  y: number,
  w: number,
  h: number
): [number, number, number] {
  const nx = x / Math.max(1, w - 1);
  const ny = y / Math.max(1, h - 1);
  const swatches = fixture.swatches;

  let r = 40;
  let g = 40;
  let b = 40;

  switch (fixture.pattern) {
    case "quadrants": {
      const idx = (ny >= 0.5 ? 2 : 0) + (nx >= 0.5 ? 1 : 0);
      const base = swatches[idx % swatches.length];
      // Subtle local tonal sweep inside each quadrant + crisp calibration crosshair & circle
      const qx = (nx * 2) % 1;
      const qy = (ny * 2) % 1;
      const shade = 0.72 + (1 - qy) * 0.22 + qx * 0.14;
      r = clampByte(base[0] * shade);
      g = clampByte(base[1] * shade);
      b = clampByte(base[2] * shade);

      // Lower calibration step wedge strip
      if (ny > 0.84 && ny < 0.93 && nx > 0.08 && nx < 0.92) {
        const step = Math.floor(((nx - 0.08) / 0.84) * 6);
        const stepColor = swatches[step % swatches.length];
        const lift = step >= 4 ? 1.15 : 0.95;
        r = clampByte(stepColor[0] * lift);
        g = clampByte(stepColor[1] * lift);
        b = clampByte(stepColor[2] * lift);
      }

      // Central optical target rings & axes
      const dist = Math.hypot((nx - 0.5) * (w / h), ny - 0.5);
      if (Math.abs(dist - 0.24) < 0.012 || Math.abs(dist - 0.11) < 0.01) {
        [r, g, b] = [236, 231, 220];
      }
      if (
        (Math.abs(nx - 0.5) < 0.005 && ny > 0.08 && ny < 0.92) ||
        (Math.abs(ny - 0.5) < 0.007 && nx > 0.06 && nx < 0.94)
      ) {
        [r, g, b] = [24, 24, 28];
      }
      break;
    }

    case "vertical-bands": {
      const band = Math.min(swatches.length - 1, Math.floor(ny * swatches.length));
      const base = swatches[band];
      const localY = (ny * swatches.length) % 1;
      const shade = 0.68 + nx * 0.36 + (1 - Math.abs(localY - 0.5) * 2) * 0.12;
      r = clampByte(base[0] * shade);
      g = clampByte(base[1] * shade);
      b = clampByte(base[2] * shade);

      // Diagonal geometric calibration stripe + concentric aperture rings
      if (Math.abs(nx - (0.2 + ny * 0.6)) < 0.045) {
        const alt = swatches[(band + 1) % swatches.length];
        [r, g, b] = blendColor([r, g, b], alt, 0.72);
      }
      const dist = Math.hypot(nx - 0.5, (ny - 0.5) * (h / w));
      if (Math.abs(dist - 0.34) < 0.015 || Math.abs(dist - 0.18) < 0.012) {
        [r, g, b] = [238, 232, 218];
      }
      break;
    }

    case "concentric-blocks": {
      const idx = (ny >= 0.5 ? 2 : 0) + (nx >= 0.5 ? 1 : 0);
      const base = swatches[idx % swatches.length];
      const dist = Math.hypot(nx - 0.5, ny - 0.5);
      const wave = 0.78 + Math.cos(dist * 18) * 0.16;
      r = clampByte(base[0] * wave);
      g = clampByte(base[1] * wave);
      b = clampByte(base[2] * wave);

      // Central diamond prism patch
      const manhattan = Math.abs(nx - 0.5) + Math.abs(ny - 0.5);
      if (manhattan < 0.24) {
        const innerColor = swatches[(idx + 2) % swatches.length];
        [r, g, b] = blendColor(innerColor, [242, 236, 224], 0.22);
      }
      if (Math.abs(manhattan - 0.24) < 0.012 || Math.abs(dist - 0.38) < 0.01) {
        [r, g, b] = [238, 234, 224];
      }
      break;
    }

    case "spectral-panorama": {
      const colFloat = nx * swatches.length;
      const col = Math.min(swatches.length - 1, Math.floor(colFloat));
      const localX = colFloat - col;
      const base = swatches[col];
      // Vertical tonal steps inside each spectral panel (top bright -> bottom deep)
      const stepIdx = Math.floor(ny * 4);
      const stepFactor = [1.08, 0.92, 0.74, 0.56][stepIdx] ?? 0.75;
      r = clampByte(base[0] * stepFactor);
      g = clampByte(base[1] * stepFactor);
      b = clampByte(base[2] * stepFactor);

      // Crisp panel divider & central calibration band
      if (localX < 0.035 || localX > 0.965) {
        [r, g, b] = [18, 20, 24];
      } else if (Math.abs(ny - 0.5) < 0.025) {
        [r, g, b] = [236, 232, 222];
      } else if (Math.abs(localX - 0.5) < 0.025 && ny > 0.2 && ny < 0.8) {
        [r, g, b] = blendColor([r, g, b], [244, 240, 230], 0.45);
      }
      break;
    }

    case "split-grid": {
      const col = nx < 0.5 ? 0 : 1;
      const row = Math.min(2, Math.floor(ny * 3));
      const localX = (nx * 2) % 1;
      const localY = (ny * 3) % 1;
      const idx = (row * 2 + col) % swatches.length;
      const base = swatches[idx];

      if (localX < 0.045 || localX > 0.955 || localY < 0.045 || localY > 0.955) {
        [r, g, b] = [18, 20, 24];
      } else {
        const radial = Math.max(0, 1 - Math.hypot(localX - 0.5, localY - 0.5) * 1.1);
        const shade = 0.74 + radial * 0.34;
        r = clampByte(base[0] * shade);
        g = clampByte(base[1] * shade);
        b = clampByte(base[2] * shade);

        // Crisp inner corner registration dot
        if (Math.hypot(localX - 0.5, localY - 0.5) < 0.14) {
          [r, g, b] = blendColor(base, [242, 238, 228], 0.6);
        }
      }
      break;
    }

    case "horizon-chart": {
      // Smooth multi-band chromatic horizon + geometric stepped colour patches
      let base: [number, number, number];
      if (ny < 0.38) {
        base = blendColor(swatches[0], swatches[1], ny / 0.38);
      } else if (ny < 0.62) {
        base = blendColor(swatches[1], swatches[2], (ny - 0.38) / 0.24);
      } else {
        base = blendColor(swatches[3], swatches[0], ((ny - 0.62) / 0.38) * 0.45);
      }
      const xMod = 0.8 + Math.sin(nx * Math.PI) * 0.26;
      r = clampByte(base[0] * xMod);
      g = clampByte(base[1] * xMod);
      b = clampByte(base[2] * xMod);

      // Synthetic stepped colour bar across middle-lower region
      if (ny > 0.58 && ny < 0.72 && nx > 0.1 && nx < 0.9) {
        const patch = Math.min(3, Math.floor(((nx - 0.1) / 0.8) * 4));
        const sc = swatches[patch];
        [r, g, b] = [sc[0], sc[1], sc[2]];
      }
      if (Math.abs(ny - 0.62) < 0.01) {
        [r, g, b] = [238, 233, 224];
      }
      break;
    }

    case "colour-checker": {
      const gx = nx * 3;
      const gy = ny * 3;
      const col = Math.min(2, Math.floor(gx));
      const row = Math.min(2, Math.floor(gy));
      const localX = gx - col;
      const localY = gy - row;

      // Darkroom matte gutters separating the 3x3 calibration patches
      if (localX < 0.09 || localX > 0.91 || localY < 0.09 || localY > 0.91) {
        [r, g, b] = [20, 22, 26];
      } else {
        const patch = swatches[(row * 3 + col) % swatches.length];
        const microGrad = 0.86 + (1 - localY) * 0.18;
        r = clampByte(patch[0] * microGrad);
        g = clampByte(patch[1] * microGrad);
        b = clampByte(patch[2] * microGrad);
      }
      break;
    }
  }

  // Subtle dark outer trim & crisp inner calibration registration frame
  const isOuterBorder = x === 0 || y === 0 || x === w - 1 || y === h - 1;
  const inset = 8;
  const isInnerRegistration =
    ((x === inset || x === w - 1 - inset) &&
      y >= inset &&
      y <= h - 1 - inset) ||
    ((y === inset || y === h - 1 - inset) &&
      x >= inset &&
      x <= w - 1 - inset);

  if (isOuterBorder) {
    return [16, 18, 22];
  }

  if (isInnerRegistration) {
    return [
      clampByte(r * 0.65 + 84),
      clampByte(g * 0.65 + 82),
      clampByte(b * 0.65 + 78),
    ];
  }

  return [r, g, b];
}

export function renderSyntheticFixturePng(
  fixture: SyntheticStillnessFixture
): Buffer {
  // Keep pixel buffer lightweight while preserving exact aspect ratio (1/3 scale).
  const w = Math.max(90, Math.round(fixture.width / 3));
  const h = Math.max(90, Math.round(fixture.height / 3));

  const stride = 1 + w * 3;
  const raw = Buffer.alloc(stride * h);

  for (let y = 0; y < h; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type: None

    for (let x = 0; x < w; x++) {
      const [r, g, b] = samplePatternPixel(fixture, x, y, w, h);
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
