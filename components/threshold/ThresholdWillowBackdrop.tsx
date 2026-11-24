/**
 * Decorative sunlit lakeside weeping willow backdrop for the Threshold.
 *
 * - Preserves the hand-painted watercolor & gouache desktop and mobile lakeside
 *   illustrations intact while adding a cohesive, restrained, living environment:
 *   1. Coherent natural willow breeze: a single gentle afternoon breeze flows
 *      smoothly across 7 desktop and 5 mobile hanging branch groups with
 *      restrained upper-branch motion and subtly delayed trailing tips, while
 *      the trunk and structural limbs stay completely stable.
 *   2. Fluid lake-clipped willow reflection: inverted, vertically elongated,
 *      water-softened reflections of the actual overhanging willow branches
 *      clipped strictly to the measured lake shoreline polygons (`<clipPath>`),
 *      broken into 4 undulating horizontal water strata that follow the
 *      branches above with damped, slightly delayed motion plus subtle vertical
 *      stretch/compression.
 *   3. Calm living lake: slow, gently travelling horizontal ripples, soft
 *      turquoise/blue-green surface variations, shifting morning sunlight, and
 *      sparingly placed pollen motes.
 * - Strictly decorative (`aria-hidden="true"`, `pointer-events-none`), zero
 *   inline `style=""` attributes (strict nonce CSP compliant), zero external
 *   animation libraries, zero continuous React renders, and complete static
 *   rendering (including static willow & static reflection) under
 *   `prefers-reduced-motion: reduce`.
 */

interface BreezeStrandSpec {
  x0: number;
  y0: number;
  archX: number;
  archY: number;
  length: number;
  tipDriftX: number;
  leafStep: number;
  leafLen: number;
  seed: number;
}

interface BreezeGroupSpec {
  id: string;
  swayClass: string;
  tipClass: string;
  stemColor: string;
  leafColor: string;
  highlightColor: string;
  opacity: string;
  /** Whether this canopy group overhangs the lake and casts a water reflection. */
  reflectsInLake?: boolean;
  /** Damped, slightly delayed CSS class linking this group's lake reflection to its breeze phase. */
  reflectClass?: string;
  strands: readonly BreezeStrandSpec[];
}

interface ReflectionBandPaths {
  id: string;
  bandClass: string;
  reflectClass: string;
  basePath: string;
  goldPath: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function evalCubic(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

/**
 * Splits each cascading weeping willow branch smoothly at t = 0.48 so the
 * upper hanging branch moves gently and its delicate lower tip follows with a
 * subtle phase delay.
 */
function buildNestedBreezePaths(strands: readonly BreezeStrandSpec[]): {
  upperStemsPath: string;
  upperLeavesPath: string;
  upperHighlightPath: string;
  tipStemsPath: string;
  tipLeavesPath: string;
  tipHighlightPath: string;
} {
  const upperStems: string[] = [];
  const upperLeaves: string[] = [];
  const upperHighlights: string[] = [];
  const tipStems: string[] = [];
  const tipLeaves: string[] = [];
  const tipHighlights: string[] = [];

  for (const s of strands) {
    const c1x = s.x0 + s.archX * 0.72;
    const c1y = s.y0 + s.archY;
    const shoulderX = s.x0 + s.archX;
    const c2x = shoulderX + s.tipDriftX * 0.45;
    const c2y = s.y0 + s.length * 0.36;
    const x3 = shoulderX + s.tipDriftX;
    const y3 = s.y0 + s.length;

    const splitT = 0.48;
    const midX = evalCubic(splitT, s.x0, c1x, c2x, x3);
    const midY = evalCubic(splitT, s.y0, c1y, c2y, y3);
    const q1x = s.x0 + (c1x - s.x0) * splitT;
    const q1y = s.y0 + (c1y - s.y0) * splitT;
    const q2x = c1x + (c2x - c1x) * splitT;
    const q2y = c1y + (c2y - c1y) * splitT;
    const q3x = c2x + (x3 - c2x) * splitT;
    const q3y = c2y + (y3 - c2y) * splitT;
    const r1x = q1x + (q2x - q1x) * splitT;
    const r1y = q1y + (q2y - q1y) * splitT;
    const r2x = q2x + (q3x - q2x) * splitT;
    const r2y = q2y + (q3y - q2y) * splitT;

    upperStems.push(
      `M${round1(s.x0)},${round1(s.y0)}C${round1(q1x)},${round1(q1y)} ${round1(r1x)},${round1(r1y)} ${round1(midX)},${round1(midY)}`
    );
    tipStems.push(
      `M${round1(midX)},${round1(midY)}C${round1(r2x)},${round1(r2y)} ${round1(q3x)},${round1(q3y)} ${round1(x3)},${round1(y3)}`
    );

    const steps = Math.max(7, Math.floor(s.length / s.leafStep));
    for (let i = 1; i <= steps; i++) {
      const jitter = Math.sin(i * 2.17 + s.seed) * 0.24;
      const t = Math.min(0.985, Math.max(0.06, (i + jitter * 0.36) / (steps + 0.5)));

      const px = evalCubic(t, s.x0, c1x, c2x, x3);
      const py = evalCubic(t, s.y0, c1y, c2y, y3);

      const envelope =
        t < 0.16
          ? 0.62 + (t / 0.16) * 0.38
          : 1 - Math.pow((t - 0.16) / 0.84, 1.15) * 0.38;
      const len = s.leafLen * envelope * (1 + Math.sin(i * 3.11 + s.seed) * 0.2);
      const width = len * 0.2;

      const side = (i + Math.round(s.seed)) % 2 === 0 ? 1 : -1;
      const spread = 0.23 + Math.abs(Math.cos(i * 1.43 + s.seed)) * 0.23;
      const dx = side * len * spread;
      const dy = len * 0.96;

      const primaryLeaf = `M${round1(px)},${round1(py)}Q${round1(px + dx * 0.46 + side * width)},${round1(py + dy * 0.36)} ${round1(px + dx)},${round1(py + dy)}Q${round1(px + dx * 0.42 - side * width * 0.44)},${round1(py + dy * 0.6)} ${round1(px)},${round1(py)}`;

      const isTip = t >= splitT;
      const targetLeaves = isTip ? tipLeaves : upperLeaves;
      const targetHighlights = isTip ? tipHighlights : upperHighlights;

      if ((i + Math.floor(s.seed)) % 3 === 0) {
        targetHighlights.push(primaryLeaf);
      } else {
        targetLeaves.push(primaryLeaf);
      }

      if (t > 0.1 && t < 0.9 && (i + Math.floor(s.seed)) % 4 !== 0) {
        const opp = -side;
        const len2 = len * 0.8;
        const w2 = len2 * 0.19;
        const dx2 = opp * len2 * 0.25;
        const dy2 = len2 * 0.98;
        const py2 = py + 2.2;

        const companionLeaf = `M${round1(px)},${round1(py2)}Q${round1(px + dx2 * 0.45 + opp * w2)},${round1(py2 + dy2 * 0.38)} ${round1(px + dx2)},${round1(py2 + dy2)}Q${round1(px + dx2 * 0.4 - opp * w2 * 0.42)},${round1(py2 + dy2 * 0.6)} ${round1(px)},${round1(py2)}`;

        if ((i + Math.floor(s.seed)) % 5 === 0) {
          targetHighlights.push(companionLeaf);
        } else {
          targetLeaves.push(companionLeaf);
        }
      }
    }
  }

  return {
    upperStemsPath: upperStems.join(""),
    upperLeavesPath: upperLeaves.join(""),
    upperHighlightPath: upperHighlights.join(""),
    tipStemsPath: tipStems.join(""),
    tipLeavesPath: tipLeaves.join(""),
    tipHighlightPath: tipHighlights.join(""),
  };
}

/**
 * Generates softened, inverted, vertically elongated watercolor water-reflection
 * brushstrokes derived directly from the overhanging willow branches above,
 * broken into 4 horizontal water strata so ripples bend and undulate the
 * reflection organically rather than moving as one rigid mirrored image.
 */
function buildWillowReflectionBands(
  groups: readonly BreezeGroupSpec[],
  waterlineY: number,
  maxDepth: number,
  horizontalShift: number
): ReflectionBandPaths[] {
  const bands: ReflectionBandPaths[] = [];
  const strataCount = 4;

  for (const group of groups) {
    if (!group.reflectsInLake || !group.reflectClass) {
      continue;
    }

    const baseBuckets: string[][] = Array.from({ length: strataCount }, () => []);
    const goldBuckets: string[][] = Array.from({ length: strataCount }, () => []);

    for (const s of group.strands) {
      const c1x = s.x0 + s.archX * 0.72;
      const shoulderX = s.x0 + s.archX;
      const c2x = shoulderX + s.tipDriftX * 0.45;
      const x3 = shoulderX + s.tipDriftX;

      // Sample along the real hanging branch and mirror/elongate softly downward into the lake
      const samples = 15;
      for (let i = 0; i < samples; i++) {
        // u goes from 0 (lowest hanging tip nearest the water) to 1 (upper crown deeper in reflection)
        const u = i / (samples - 1);
        const branchT = 0.96 - u * 0.78;
        const bx = evalCubic(branchT, s.x0, c1x, c2x, x3);

        // Inverted vertical elongation with gentle wave wobble
        const depth = 6 + Math.pow(u, 1.06) * maxDepth;
        const ry = waterlineY + depth;
        const waveX = Math.sin(u * 10.5 + s.seed * 1.7) * (4.5 + u * 8.5);
        const rx = bx + horizontalShift * (0.25 + u * 0.75) + waveX;

        // Horizontal ripple-broken watercolor stroke width widens softly deeper in water
        const halfW = (11 + Math.abs(Math.cos(i * 1.9 + s.seed)) * 12) * (0.78 + u * 0.68);
        const halfH = (3.4 + (1 - u) * 2.2) * (0.85 + Math.abs(Math.sin(i * 2.3 + s.seed)) * 0.45);

        // Soft organic horizontal brushstroke lens (no sharp polygon edges)
        const stroke = `M${round1(rx - halfW)},${round1(ry)}Q${round1(rx)},${round1(ry - halfH)} ${round1(rx + halfW)},${round1(ry)}Q${round1(rx)},${round1(ry + halfH)} ${round1(rx - halfW)},${round1(ry)}`;

        const stratum = Math.min(strataCount - 1, Math.floor(u * strataCount));
        if ((i + Math.floor(s.seed)) % 3 === 0) {
          goldBuckets[stratum].push(stroke);
        } else {
          baseBuckets[stratum].push(stroke);
        }

        // Secondary broken horizontal ripple fragment beside the main branch reflection
        if (i % 2 === 1) {
          const offsetSide = (i + Math.round(s.seed)) % 2 === 0 ? 1 : -1;
          const rx2 = rx + offsetSide * (halfW * 0.62 + 5);
          const ry2 = ry + 3.8;
          const hw2 = halfW * 0.68;
          const hh2 = halfH * 0.72;
          const fragment = `M${round1(rx2 - hw2)},${round1(ry2)}Q${round1(rx2)},${round1(ry2 - hh2)} ${round1(rx2 + hw2)},${round1(ry2)}Q${round1(rx2)},${round1(ry2 + hh2)} ${round1(rx2 - hw2)},${round1(ry2)}`;
          baseBuckets[stratum].push(fragment);
        }
      }
    }

    for (let b = 0; b < strataCount; b++) {
      if (baseBuckets[b].length > 0 || goldBuckets[b].length > 0) {
        bands.push({
          id: `${group.id}-ref-${b + 1}`,
          bandClass: `willow-ref-stratum-${b + 1}`,
          reflectClass: group.reflectClass,
          basePath: baseBuckets[b].join(""),
          goldPath: goldBuckets[b].join(""),
        });
      }
    }
  }

  return bands;
}

/**
 * Desktop lake shoreline polygon measured directly on `threshold-garden-desktop.webp`
 * (1376x768) so reflections & ripples stay 100% strictly inside the calm lake water
 * and never spill onto the shore, rocks, clearing, path, or foreground reeds.
 */
const DESKTOP_LAKE_CLIP_PATH =
  "M0,452 L640,452 L885,456 L1042,466 L1028,494 L952,500 L886,504 L848,530 L794,548 L734,566 L688,582 L750,596 L822,614 L788,634 L714,650 L620,656 L566,634 L486,634 L452,658 L396,668 L352,694 L334,724 L244,720 L162,692 L84,674 L0,656 Z";

/**
 * Mobile lake shoreline polygon measured directly on `threshold-garden-mobile.webp`
 * (768x1376), curving cleanly around the shoreline stones & meadow bank.
 */
const MOBILE_LAKE_CLIP_PATH =
  "M0,852 L566,852 L666,860 L666,994 L538,994 L486,998 L414,1022 L396,1042 L356,1048 L292,1076 L242,1092 L202,1104 L144,1090 L88,1070 L34,1060 L0,1054 Z";

/**
 * Seven coherently phased desktop hanging willow groups (21 whips) in 1376x768.
 * Groups overhanging the lake (`reflectsInLake: true`) drive damped, slightly
 * delayed willow reflections clipped strictly to the lake water below them.
 */
const DESKTOP_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "desk-outer-lake-veil",
    swayClass: "willow-sway-1",
    tipClass: "willow-tip-1",
    stemColor: "#6d8f56",
    leafColor: "#7ea15e",
    highlightColor: "#c5d37d",
    opacity: "0.76",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-1",
    strands: [
      { x0: 634, y0: 214, archX: -58, archY: -12, length: 286, tipDriftX: -18, leafStep: 15, leafLen: 22, seed: 1.2 },
      { x0: 668, y0: 172, archX: -52, archY: -14, length: 342, tipDriftX: -14, leafStep: 15, leafLen: 24, seed: 2.4 },
      { x0: 702, y0: 138, archX: -42, archY: -16, length: 382, tipDriftX: -12, leafStep: 15, leafLen: 24, seed: 3.1 },
    ],
  },
  {
    id: "desk-sunlit-shoulder",
    swayClass: "willow-sway-2",
    tipClass: "willow-tip-2",
    stemColor: "#7c9b5b",
    leafColor: "#92b066",
    highlightColor: "#d3dc8a",
    opacity: "0.78",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-2",
    strands: [
      { x0: 742, y0: 122, archX: -36, archY: -14, length: 394, tipDriftX: -10, leafStep: 15, leafLen: 25, seed: 4.3 },
      { x0: 782, y0: 108, archX: -28, archY: -14, length: 404, tipDriftX: -8, leafStep: 15, leafLen: 25, seed: 5.5 },
      { x0: 822, y0: 102, archX: -22, archY: -12, length: 386, tipDriftX: -6, leafStep: 16, leafLen: 24, seed: 6.2 },
    ],
  },
  {
    id: "desk-clearing-arch",
    swayClass: "willow-sway-3",
    tipClass: "willow-tip-3",
    stemColor: "#6e9157",
    leafColor: "#85a662",
    highlightColor: "#ced984",
    opacity: "0.74",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-3",
    strands: [
      { x0: 866, y0: 104, archX: -18, archY: -12, length: 356, tipDriftX: -6, leafStep: 16, leafLen: 23, seed: 7.4 },
      { x0: 912, y0: 108, archX: -14, archY: -10, length: 326, tipDriftX: -4, leafStep: 16, leafLen: 23, seed: 8.6 },
      { x0: 954, y0: 118, archX: -10, archY: -10, length: 304, tipDriftX: -4, leafStep: 16, leafLen: 22, seed: 9.1 },
    ],
  },
  {
    id: "desk-high-crown-drape",
    swayClass: "willow-sway-4",
    tipClass: "willow-tip-4",
    stemColor: "#5c8150",
    leafColor: "#70965d",
    highlightColor: "#b8ca75",
    opacity: "0.72",
    strands: [
      { x0: 998, y0: 98, archX: -8, archY: -10, length: 312, tipDriftX: -2, leafStep: 16, leafLen: 22, seed: 10.3 },
      { x0: 1044, y0: 94, archX: 8, archY: -10, length: 292, tipDriftX: 4, leafStep: 16, leafLen: 22, seed: 11.7 },
      { x0: 1094, y0: 102, archX: 14, archY: -10, length: 282, tipDriftX: 6, leafStep: 16, leafLen: 22, seed: 12.2 },
    ],
  },
  {
    id: "desk-emerald-right",
    swayClass: "willow-sway-5",
    tipClass: "willow-tip-5",
    stemColor: "#4f7548",
    leafColor: "#608855",
    highlightColor: "#a2bc6d",
    opacity: "0.74",
    strands: [
      { x0: 1164, y0: 112, archX: 20, archY: -10, length: 328, tipDriftX: 8, leafStep: 15, leafLen: 23, seed: 13.5 },
      { x0: 1214, y0: 120, archX: 24, archY: -10, length: 344, tipDriftX: 10, leafStep: 15, leafLen: 23, seed: 14.8 },
      { x0: 1264, y0: 132, archX: 26, archY: -10, length: 326, tipDriftX: 12, leafStep: 15, leafLen: 23, seed: 15.1 },
    ],
  },
  {
    id: "desk-far-right-veil",
    swayClass: "willow-sway-6",
    tipClass: "willow-tip-6",
    stemColor: "#496d44",
    leafColor: "#5a8050",
    highlightColor: "#9ab569",
    opacity: "0.72",
    strands: [
      { x0: 1304, y0: 146, archX: 28, archY: -8, length: 318, tipDriftX: 14, leafStep: 16, leafLen: 22, seed: 16.4 },
      { x0: 1336, y0: 168, archX: 22, archY: -8, length: 288, tipDriftX: 10, leafStep: 16, leafLen: 21, seed: 17.7 },
    ],
  },
  {
    id: "desk-foreground-wisps",
    swayClass: "willow-sway-7",
    tipClass: "willow-tip-7",
    stemColor: "#89a560",
    leafColor: "#a3bc6e",
    highlightColor: "#dce493",
    opacity: "0.76",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-1",
    strands: [
      { x0: 618, y0: 266, archX: -48, archY: -8, length: 256, tipDriftX: -16, leafStep: 15, leafLen: 22, seed: 18.2 },
      { x0: 760, y0: 204, archX: -30, archY: -10, length: 324, tipDriftX: -10, leafStep: 15, leafLen: 23, seed: 19.6 },
      { x0: 888, y0: 188, archX: -16, archY: -8, length: 274, tipDriftX: -6, leafStep: 16, leafLen: 22, seed: 20.1 },
      { x0: 1240, y0: 196, archX: 22, archY: -8, length: 266, tipDriftX: 10, leafStep: 16, leafLen: 22, seed: 21.4 },
    ],
  },
];

/**
 * Five coherently phased mobile hanging willow groups (14 whips) in 768x1376.
 */
const MOBILE_BREEZE_GROUPS: readonly BreezeGroupSpec[] = [
  {
    id: "mob-lake-overhang",
    swayClass: "willow-sway-1",
    tipClass: "willow-tip-1",
    stemColor: "#88a25f",
    leafColor: "#a1ba6c",
    highlightColor: "#d6df8c",
    opacity: "0.76",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-1",
    strands: [
      { x0: 280, y0: 774, archX: -38, archY: -10, length: 254, tipDriftX: -12, leafStep: 16, leafLen: 22, seed: 22.2 },
      { x0: 322, y0: 716, archX: -34, archY: -12, length: 312, tipDriftX: -10, leafStep: 16, leafLen: 23, seed: 23.5 },
      { x0: 364, y0: 668, archX: -28, archY: -14, length: 344, tipDriftX: -8, leafStep: 16, leafLen: 23, seed: 24.1 },
    ],
  },
  {
    id: "mob-sunlit-arch",
    swayClass: "willow-sway-2",
    tipClass: "willow-tip-2",
    stemColor: "#7c9b5d",
    leafColor: "#94b169",
    highlightColor: "#d2dc88",
    opacity: "0.74",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-2",
    strands: [
      { x0: 410, y0: 636, archX: -22, archY: -12, length: 342, tipDriftX: -6, leafStep: 16, leafLen: 23, seed: 25.4 },
      { x0: 454, y0: 616, archX: -16, archY: -12, length: 330, tipDriftX: -4, leafStep: 16, leafLen: 22, seed: 26.8 },
      { x0: 496, y0: 612, archX: -8, archY: -10, length: 312, tipDriftX: -2, leafStep: 16, leafLen: 22, seed: 27.3 },
    ],
  },
  {
    id: "mob-center-crown",
    swayClass: "willow-sway-3",
    tipClass: "willow-tip-3",
    stemColor: "#698d58",
    leafColor: "#7fa265",
    highlightColor: "#c2d27b",
    opacity: "0.72",
    strands: [
      { x0: 544, y0: 618, archX: 10, archY: -10, length: 306, tipDriftX: 4, leafStep: 16, leafLen: 22, seed: 28.6 },
      { x0: 588, y0: 634, archX: 16, archY: -10, length: 304, tipDriftX: 6, leafStep: 16, leafLen: 22, seed: 29.2 },
    ],
  },
  {
    id: "mob-right-drape",
    swayClass: "willow-sway-5",
    tipClass: "willow-tip-5",
    stemColor: "#587e51",
    leafColor: "#6d945f",
    highlightColor: "#adc473",
    opacity: "0.74",
    strands: [
      { x0: 636, y0: 658, archX: 22, archY: -10, length: 312, tipDriftX: 8, leafStep: 16, leafLen: 22, seed: 30.5 },
      { x0: 682, y0: 688, archX: 26, archY: -10, length: 292, tipDriftX: 10, leafStep: 16, leafLen: 22, seed: 31.1 },
      { x0: 718, y0: 734, archX: 24, archY: -8, length: 258, tipDriftX: 10, leafStep: 16, leafLen: 21, seed: 32.4 },
    ],
  },
  {
    id: "mob-outer-shimmer",
    swayClass: "willow-sway-7",
    tipClass: "willow-tip-7",
    stemColor: "#8ea863",
    leafColor: "#a8c171",
    highlightColor: "#dce494",
    opacity: "0.74",
    reflectsInLake: true,
    reflectClass: "willow-ref-lag-3",
    strands: [
      { x0: 306, y0: 790, archX: -32, archY: -8, length: 236, tipDriftX: -12, leafStep: 16, leafLen: 21, seed: 33.7 },
      { x0: 472, y0: 676, archX: -12, archY: -8, length: 268, tipDriftX: -4, leafStep: 16, leafLen: 21, seed: 34.2 },
      { x0: 660, y0: 742, archX: 22, archY: -8, length: 246, tipDriftX: 10, leafStep: 16, leafLen: 21, seed: 35.8 },
    ],
  },
];

const COMPILED_DESKTOP_BREEZE = DESKTOP_BREEZE_GROUPS.map((g) => ({
  ...g,
  ...buildNestedBreezePaths(g.strands),
}));

const COMPILED_MOBILE_BREEZE = MOBILE_BREEZE_GROUPS.map((g) => ({
  ...g,
  ...buildNestedBreezePaths(g.strands),
}));

// Inverted, ripple-broken willow reflections anchored directly beneath the overhanging branches
const DESKTOP_REFLECTION_BANDS = buildWillowReflectionBands(
  DESKTOP_BREEZE_GROUPS,
  478,
  182,
  -54
);

const MOBILE_REFLECTION_BANDS = buildWillowReflectionBands(
  MOBILE_BREEZE_GROUPS,
  866,
  214,
  -26
);

export function ThresholdWillowBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="threshold-garden-layer pointer-events-none select-none"
    >
      {/* Seamless luminous spring-morning sky continuation for tall mobile & ultra-wide screens */}
      <div className="threshold-storybook-sky" />

      {/* Hand-painted watercolor & gouache lakeside willow sanctuary (desktop & portrait compositions) */}
      <picture className="threshold-garden-picture">
        <source
          media="(min-width: 48rem)"
          srcSet="/images/threshold-garden-desktop.webp"
          type="image/webp"
        />
        <img
          src="/images/threshold-garden-mobile.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className="threshold-garden-artwork"
        />
      </picture>

      {/* Desktop living lake surface + willow reflection (clipped strictly to exact lake shoreline) */}
      <svg
        viewBox="0 0 1376 768"
        preserveAspectRatio="xMaxYMid slice"
        focusable="false"
        aria-hidden="true"
        className="threshold-breeze-svg threshold-breeze-desktop"
      >
        <defs>
          <clipPath id="desk-lake-clip">
            <path d={DESKTOP_LAKE_CLIP_PATH} />
          </clipPath>

          {/* Soft vertical water attenuation so reflected foliage fades naturally into turquoise water */}
          <linearGradient id="desk-ref-green-fade" x1="0" y1="470" x2="0" y2="670" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#56876a" stopOpacity="0.62" />
            <stop offset="46%" stopColor="#5e9678" stopOpacity="0.46" />
            <stop offset="82%" stopColor="#6ea690" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#84bcc0" stopOpacity="0.06" />
          </linearGradient>

          <linearGradient id="desk-ref-gold-fade" x1="0" y1="470" x2="0" y2="665" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b2c474" stopOpacity="0.58" />
            <stop offset="48%" stopColor="#b7ca80" stopOpacity="0.42" />
            <stop offset="84%" stopColor="#b8d09a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#c9e2da" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="desk-water-swell-a" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#77bec6" stopOpacity="0" />
            <stop offset="35%" stopColor="#77bec6" stopOpacity="0.22" />
            <stop offset="68%" stopColor="#f8f6e4" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#77bec6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="desk-water-swell-b" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#69b1bc" stopOpacity="0" />
            <stop offset="32%" stopColor="#eef7f2" stopOpacity="0.3" />
            <stop offset="66%" stopColor="#82c4c6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#69b1bc" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="desk-ripple-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="30%" stopColor="#fffef4" stopOpacity="0.62" />
            <stop offset="70%" stopColor="#dbf4f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layer A: Clipped calm mountain lake surface & living willow canopy reflection */}
        <g clipPath="url(#desk-lake-clip)">
          {/* Subtle turquoise & sunlit water tonal swells at different depths */}
          <g className="threshold-lake-surface-a">
            <rect x="60" y="476" width="540" height="34" rx="17" fill="url(#desk-water-swell-a)" />
            <rect x="180" y="546" width="560" height="44" rx="22" fill="url(#desk-water-swell-b)" />
          </g>
          <g className="threshold-lake-surface-b">
            <rect x="20" y="512" width="460" height="36" rx="18" fill="url(#desk-water-swell-b)" />
            <rect x="110" y="608" width="520" height="42" rx="21" fill="url(#desk-water-swell-a)" />
          </g>

          {/* Fluid willow reflection: 4 ripple-broken horizontal strata coupled to overhanging branches */}
          <g className="willow-reflection-soft">
            {DESKTOP_REFLECTION_BANDS.map((band) => (
              <g key={band.id} className={`willow-ref-coupled ${band.reflectClass}`}>
                <g className={`willow-ref-stratum ${band.bandClass}`}>
                  <path d={band.basePath} fill="url(#desk-ref-green-fade)" />
                  <path d={band.goldPath} fill="url(#desk-ref-gold-fade)" />
                </g>
              </g>
            ))}
          </g>

          {/* Gently travelling horizontal lake ripples crossing open water and breaking up the reflection */}
          <g className="threshold-lake-ripple threshold-lake-ripple-far">
            <rect x="110" y="468" width="210" height="2.4" rx="1.2" fill="url(#desk-ripple-stroke)" />
            <rect x="420" y="484" width="240" height="2.6" rx="1.3" fill="url(#desk-ripple-stroke)" />
            <rect x="690" y="476" width="180" height="2.4" rx="1.2" fill="url(#desk-ripple-stroke)" />
          </g>
          <g className="threshold-lake-ripple threshold-lake-ripple-mid">
            <rect x="60" y="518" width="270" height="3.2" rx="1.6" fill="url(#desk-ripple-stroke)" />
            <rect x="370" y="534" width="310" height="3.4" rx="1.7" fill="url(#desk-ripple-stroke)" />
            <rect x="590" y="514" width="220" height="3" rx="1.5" fill="url(#desk-ripple-stroke)" />
            <rect x="180" y="562" width="290" height="3.4" rx="1.7" fill="url(#desk-ripple-stroke)" />
          </g>
          <g className="threshold-lake-ripple threshold-lake-ripple-near">
            <rect x="90" y="596" width="320" height="4" rx="2" fill="url(#desk-ripple-stroke)" />
            <rect x="440" y="588" width="300" height="3.8" rx="1.9" fill="url(#desk-ripple-stroke)" />
            <rect x="210" y="636" width="310" height="4.2" rx="2.1" fill="url(#desk-ripple-stroke)" />
            <rect x="520" y="624" width="240" height="3.6" rx="1.8" fill="url(#desk-ripple-stroke)" />
          </g>
        </g>

        {/* Layer B: Coherent, natural two-tier hanging willow branches (above the water) */}
        {COMPILED_DESKTOP_BREEZE.map((group) => (
          <g
            key={group.id}
            className={`willow-curtain ${group.swayClass}`}
            opacity={group.opacity}
          >
            <path
              d={group.upperStemsPath}
              fill="none"
              stroke={group.stemColor}
              strokeWidth="1.65"
              strokeLinecap="round"
            />
            <path d={group.upperLeavesPath} fill={group.leafColor} />
            <path d={group.upperHighlightPath} fill={group.highlightColor} />

            {/* Lower delicate tips following the parent branch with a subtle natural breeze lag */}
            <g className={`willow-tip-cluster ${group.tipClass}`}>
              <path
                d={group.tipStemsPath}
                fill="none"
                stroke={group.stemColor}
                strokeWidth="1.45"
                strokeLinecap="round"
              />
              <path d={group.tipLeavesPath} fill={group.leafColor} />
              <path d={group.tipHighlightPath} fill={group.highlightColor} />
            </g>
          </g>
        ))}
      </svg>

      {/* Mobile living lake surface + willow reflection + swaying willow canopy (768x1376) */}
      <svg
        viewBox="0 0 768 1376"
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
        aria-hidden="true"
        className="threshold-breeze-svg threshold-breeze-mobile"
      >
        <defs>
          <clipPath id="mob-lake-clip">
            <path d={MOBILE_LAKE_CLIP_PATH} />
          </clipPath>

          <linearGradient id="mob-ref-green-fade" x1="0" y1="860" x2="0" y2="1095" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#56896b" stopOpacity="0.62" />
            <stop offset="48%" stopColor="#5e987b" stopOpacity="0.46" />
            <stop offset="84%" stopColor="#72ad96" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#89c4c8" stopOpacity="0.06" />
          </linearGradient>

          <linearGradient id="mob-ref-gold-fade" x1="0" y1="860" x2="0" y2="1090" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b2c474" stopOpacity="0.58" />
            <stop offset="50%" stopColor="#b9cb82" stopOpacity="0.4" />
            <stop offset="86%" stopColor="#bdd3a0" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#cde5de" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="mob-water-swell-a" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6ec0ca" stopOpacity="0" />
            <stop offset="38%" stopColor="#6ec0ca" stopOpacity="0.24" />
            <stop offset="70%" stopColor="#f8f6e4" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6ec0ca" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="mob-ripple-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="32%" stopColor="#fffef4" stopOpacity="0.64" />
            <stop offset="68%" stopColor="#d9f4f6" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layer A: Clipped mobile lake surface & fluid willow reflection */}
        <g clipPath="url(#mob-lake-clip)">
          <g className="threshold-lake-surface-a">
            <rect x="10" y="886" width="380" height="36" rx="18" fill="url(#mob-water-swell-a)" />
            <rect x="60" y="968" width="420" height="44" rx="22" fill="url(#mob-water-swell-a)" />
          </g>
          <g className="threshold-lake-surface-b">
            <rect x="40" y="924" width="360" height="34" rx="17" fill="url(#mob-water-swell-a)" />
            <rect x="20" y="1020" width="360" height="40" rx="20" fill="url(#mob-water-swell-a)" />
          </g>

          <g className="willow-reflection-soft">
            {MOBILE_REFLECTION_BANDS.map((band) => (
              <g key={band.id} className={`willow-ref-coupled ${band.reflectClass}`}>
                <g className={`willow-ref-stratum ${band.bandClass}`}>
                  <path d={band.basePath} fill="url(#mob-ref-green-fade)" />
                  <path d={band.goldPath} fill="url(#mob-ref-gold-fade)" />
                </g>
              </g>
            ))}
          </g>

          <g className="threshold-lake-ripple threshold-lake-ripple-far">
            <rect x="30" y="878" width="180" height="2.6" rx="1.3" fill="url(#mob-ripple-stroke)" />
            <rect x="220" y="896" width="210" height="2.8" rx="1.4" fill="url(#mob-ripple-stroke)" />
          </g>
          <g className="threshold-lake-ripple threshold-lake-ripple-mid">
            <rect x="20" y="938" width="230" height="3.4" rx="1.7" fill="url(#mob-ripple-stroke)" />
            <rect x="180" y="964" width="260" height="3.6" rx="1.8" fill="url(#mob-ripple-stroke)" />
          </g>
          <g className="threshold-lake-ripple threshold-lake-ripple-near">
            <rect x="50" y="1008" width="260" height="4" rx="2" fill="url(#mob-ripple-stroke)" />
            <rect x="140" y="1044" width="220" height="3.8" rx="1.9" fill="url(#mob-ripple-stroke)" />
          </g>
        </g>

        {/* Layer B: Coherent, natural two-tier mobile hanging willow branches */}
        {COMPILED_MOBILE_BREEZE.map((group) => (
          <g
            key={group.id}
            className={`willow-curtain ${group.swayClass}`}
            opacity={group.opacity}
          >
            <path
              d={group.upperStemsPath}
              fill="none"
              stroke={group.stemColor}
              strokeWidth="1.65"
              strokeLinecap="round"
            />
            <path d={group.upperLeavesPath} fill={group.leafColor} />
            <path d={group.upperHighlightPath} fill={group.highlightColor} />

            <g className={`willow-tip-cluster ${group.tipClass}`}>
              <path
                d={group.tipStemsPath}
                fill="none"
                stroke={group.stemColor}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path d={group.tipLeavesPath} fill={group.leafColor} />
              <path d={group.tipHighlightPath} fill={group.highlightColor} />
            </g>
          </g>
        ))}
      </svg>

      {/* Soft morning sunbeams & dappled canopy light shifting gently over the willow & clearing */}
      <div className="threshold-sunlight-veil">
        <div className="threshold-sunbeam threshold-sunbeam-a" />
        <div className="threshold-sunbeam threshold-sunbeam-b" />
        <div className="threshold-dapple-pool threshold-dapple-pool-a" />
        <div className="threshold-dapple-pool threshold-dapple-pool-b" />
      </div>

      {/* Sparingly placed multi-depth sunlit pollen motes drifting smoothly in the breeze */}
      <div className="threshold-pollen-layer">
        <span className="threshold-pollen-mote threshold-pollen-1" />
        <span className="threshold-pollen-mote threshold-pollen-2" />
        <span className="threshold-pollen-mote threshold-pollen-3" />
        <span className="threshold-pollen-mote threshold-pollen-4" />
        <span className="threshold-pollen-mote threshold-pollen-5" />
        <span className="threshold-pollen-mote threshold-pollen-6" />
        <span className="threshold-pollen-mote threshold-pollen-7" />
      </div>

      {/* Softly feathered morning-sky readability veil framing foreground typography */}
      <div className="threshold-readability-veil" />
    </div>
  );
}
