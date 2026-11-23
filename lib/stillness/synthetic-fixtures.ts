import "server-only";
import { deflateSync } from "node:zlib";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";

/**
 * DEVELOPMENT / TEST-ONLY synthetic darkroom calibration plates.
 *
 * - Never registered in `lib/media/registry.ts` or `content/artifacts/stillness.ts`.
 * - Strictly blocked in production (`NODE_ENV !== "development"` returns 404).
 * - Represents portrait, landscape, square, and panoramic aspect ratios plus
 *   dated and undated items for verifying the Living Light Table visually.
 */
export interface SyntheticStillnessFixture extends StillnessClientPhoto {
  palette: {
    base: [number, number, number];
    accent: [number, number, number];
  };
}

export const SYNTHETIC_STILLNESS_FIXTURES: readonly SyntheticStillnessFixture[] = [
  {
    id: "fixture-landscape-01",
    catalogId: "TEST/01",
    src: "/api/dev/stillness-fixture/fixture-landscape-01",
    width: 900,
    height: 600,
    capturedAt: "2024-03-14",
    caption: "Synthetic landscape calibration plate (3:2).",
    altText: "Synthetic darkroom tonal gradient calibration plate, landscape orientation",
    palette: { base: [26, 28, 33], accent: [74, 79, 88] },
  },
  {
    id: "fixture-portrait-02",
    catalogId: "TEST/02",
    src: "/api/dev/stillness-fixture/fixture-portrait-02",
    width: 600,
    height: 900,
    capturedAt: "2024-03-21",
    altText: "Synthetic darkroom tonal gradient calibration plate, portrait orientation",
    palette: { base: [22, 25, 29], accent: [68, 74, 84] },
  },
  {
    id: "fixture-square-03",
    catalogId: "TEST/03",
    src: "/api/dev/stillness-fixture/fixture-square-03",
    width: 720,
    height: 720,
    capturedAt: "2024-06-08",
    caption: "Synthetic square calibration plate (1:1).",
    altText: "Synthetic darkroom tonal gradient calibration plate, square orientation",
    palette: { base: [29, 31, 36], accent: [82, 86, 94] },
  },
  {
    id: "fixture-panoramic-04",
    catalogId: "TEST/04",
    src: "/api/dev/stillness-fixture/fixture-panoramic-04",
    width: 1200,
    height: 450,
    capturedAt: "2024-06-19",
    caption: "Synthetic panoramic calibration plate (8:3).",
    altText: "Synthetic darkroom tonal gradient calibration plate, panoramic orientation",
    palette: { base: [20, 23, 28], accent: [64, 71, 82] },
  },
  {
    id: "fixture-portrait-05",
    catalogId: "TEST/05",
    src: "/api/dev/stillness-fixture/fixture-portrait-05",
    width: 560,
    height: 840,
    altText: "Synthetic undated portrait calibration plate",
    palette: { base: [25, 26, 30], accent: [76, 80, 88] },
  },
  {
    id: "fixture-landscape-06",
    catalogId: "TEST/06",
    src: "/api/dev/stillness-fixture/fixture-landscape-06",
    width: 960,
    height: 540,
    altText: "Synthetic undated wide landscape calibration plate",
    palette: { base: [23, 26, 31], accent: [70, 76, 86] },
  },
  {
    id: "fixture-square-07",
    catalogId: "TEST/07",
    src: "/api/dev/stillness-fixture/fixture-square-07",
    width: 680,
    height: 680,
    capturedAt: "2024-06-08",
    altText: "Synthetic dated square calibration plate for equal-date stability",
    palette: { base: [27, 29, 34], accent: [78, 82, 90] },
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

export function renderSyntheticFixturePng(
  fixture: SyntheticStillnessFixture
): Buffer {
  // Keep pixel buffer lightweight while preserving exact aspect ratio (1/4 scale).
  const w = Math.max(60, Math.round(fixture.width / 4));
  const h = Math.max(60, Math.round(fixture.height / 4));

  const stride = 1 + w * 3;
  const raw = Buffer.alloc(stride * h);
  const [br, bg, bb] = fixture.palette.base;
  const [ar, ag, ab] = fixture.palette.accent;

  for (let y = 0; y < h; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type: None
    const ny = y / (h - 1);

    for (let x = 0; x < w; x++) {
      const nx = x / (w - 1);
      const isBorder = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const isInnerFrame =
        (x === 10 || x === w - 11) && y >= 10 && y <= h - 11
          ? true
          : (y === 10 || y === h - 11) && x >= 10 && x <= w - 11;

      const radial = Math.max(
        0,
        1 - Math.hypot(nx - 0.45, ny - 0.4) * 1.15
      );
      const tone = radial * 0.85 + (1 - ny) * 0.15;

      let r = Math.round(br + (ar - br) * tone);
      let g = Math.round(bg + (ag - bg) * tone);
      let b = Math.round(bb + (ab - bb) * tone);

      if (isInnerFrame) {
        r = Math.min(255, r + 24);
        g = Math.min(255, g + 24);
        b = Math.min(255, b + 24);
      } else if (isBorder) {
        r = Math.max(0, r - 10);
        g = Math.max(0, g - 10);
        b = Math.max(0, b - 10);
      }

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
